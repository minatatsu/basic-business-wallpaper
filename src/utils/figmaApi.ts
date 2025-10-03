import { projectId, publicAnonKey } from "./supabase/info";
import { FIGMA_CONFIG } from "../types";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-b35d308f`;

// Helper to wrap Figma S3 URLs with our proxy to bypass CORS
export function wrapImageUrl(figmaUrl: string): string {
  if (!figmaUrl) return figmaUrl;
  return `${API_BASE}/image-proxy?url=${encodeURIComponent(figmaUrl)}`;
}

async function fetchWithRetry<T>(
  fetcher: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetcher();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        console.log(`Retry ${i + 1}/${maxRetries - 1} after ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

export async function fetchFigmaImageUrls(
  nodeIds: string[],
): Promise<Record<string, string>> {
  return fetchWithRetry(async () => {
    const url = `${API_BASE}/figma/images?fileKey=${FIGMA_CONFIG.fileKey}&nodeIds=${nodeIds.join(",")}&format=base64`;
    console.log(`[FigmaAPI] Fetching images for ${nodeIds.length} nodes...`);
    console.log(`[FigmaAPI] URL: ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log(`[FigmaAPI] Response status: ${response.status}`);

      if (!response.ok) {
        const error = await response.json();
        console.error("[FigmaAPI] Error response:", error);
        throw new Error(
          `Failed to fetch Figma images: ${error.error || response.statusText}`,
        );
      }

      const data = await response.json();
      console.log(
        "[FigmaAPI] ✓ Successfully fetched Figma images:",
        Object.keys(data.images || {}).length,
        "images",
      );

      // Check if images are base64 data URLs or raw S3 URLs
      const images = data.images || {};
      const firstImageUrl = Object.values(images)[0] as string | undefined;

      if (firstImageUrl && firstImageUrl.startsWith("data:")) {
        console.log("[FigmaAPI] Images are already base64 data URLs");
        return images;
      } else {
        console.log(
          "[FigmaAPI] ⚠ Edge Function returned raw URLs, converting to base64 on client...",
        );

        // Convert S3 URLs to base64 on client side
        const base64Images: Record<string, string> = {};

        for (const [nodeId, imageUrl] of Object.entries(images)) {
          if (typeof imageUrl !== "string") continue;

          try {
            console.log(`[FigmaAPI] Converting ${nodeId} to base64...`);
            const imgResponse = await fetch(imageUrl);

            if (!imgResponse.ok) {
              console.error(
                `[FigmaAPI] Failed to fetch image for ${nodeId}: ${imgResponse.status}`,
              );
              continue;
            }

            const blob = await imgResponse.blob();
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });

            base64Images[nodeId] = base64;
            console.log(`[FigmaAPI] ✓ Converted ${nodeId} to base64`);
          } catch (err) {
            console.error(
              `[FigmaAPI] Error converting ${nodeId} to base64:`,
              err,
            );
          }
        }

        console.log(
          `[FigmaAPI] ✓ Converted ${Object.keys(base64Images).length} images to base64`,
        );
        return base64Images;
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        console.error("[FigmaAPI] Request timed out");
        throw new Error(
          "Request timed out - Figma API is taking too long to respond",
        );
      }
      console.error("[FigmaAPI] Fetch error:", error);
      throw error;
    }
  }, 2);
}

export async function fetchFigmaNodes(nodeIds: string[]): Promise<any> {
  return fetchWithRetry(async () => {
    const url = `${API_BASE}/figma/nodes?fileKey=${FIGMA_CONFIG.fileKey}&nodeIds=${nodeIds.join(",")}`;
    console.log(`[FigmaAPI] Fetching nodes for ${nodeIds.length} nodes...`);
    console.log(`[FigmaAPI] URL: ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log(`[FigmaAPI] Response status: ${response.status}`);

      if (!response.ok) {
        const error = await response.json();
        console.error("[FigmaAPI] Error response:", error);
        throw new Error(
          `Failed to fetch Figma nodes: ${error.error || response.statusText}`,
        );
      }

      const data = await response.json();
      console.log(
        "[FigmaAPI] ✓ Successfully fetched Figma nodes:",
        Object.keys(data.nodes || {}).length,
        "nodes",
      );
      return data.nodes || {};
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        console.error("[FigmaAPI] Request timed out");
        throw new Error(
          "Request timed out - Figma API is taking too long to respond",
        );
      }
      console.error("[FigmaAPI] Fetch error:", error);
      throw error;
    }
  }, 2);
}

// Helper to find text layers and frames in a node tree
export function findTextLayers(node: any, prefix = "#"): Record<string, any> {
  const textLayers: Record<string, any> = {};

  function traverse(n: any, parent: any = null) {
    if (!n) return;

    // Check if this is a text node with a name starting with prefix
    if (n.type === "TEXT" && n.name?.startsWith(prefix)) {
      const fieldName = n.name.substring(prefix.length);
      textLayers[fieldName] = {
        ...n,
        layoutGrow: n.layoutGrow,
        layoutAlign: n.layoutAlign,
        layoutPositioning: n.layoutPositioning,
        constraints: n.constraints,
        effects: n.effects, // Include effects (drop shadows, etc.)
        parentId: parent?.id,
      };
    }

    // Traverse children
    if (n.children) {
      n.children.forEach((child: any) => traverse(child, n));
    }
  }

  traverse(node);
  return textLayers;
}

// Helper to find frames with auto-layout (including nested frames)
export function findAutoLayoutFrames(
  node: any,
  textLayerIds: Set<string>,
): Record<string, any> {
  const frames: Record<string, any> = {};

  function hasTextLayerDescendant(n: any): boolean {
    if (!n) return false;
    if (n.type === "TEXT" && n.name?.startsWith("#")) return true;
    if (n.children) {
      return n.children.some((child: any) => hasTextLayerDescendant(child));
    }
    return false;
  }

  function traverse(n: any) {
    if (!n) return;

    // Check if this is a frame with layout mode
    if (
      (n.type === "FRAME" || n.type === "GROUP") &&
      n.layoutMode &&
      n.layoutMode !== "NONE"
    ) {
      const hasRelevantChildren = hasTextLayerDescendant(n);

      if (hasRelevantChildren) {
        const childIds: string[] = [];
        const childFrameIds: string[] = [];

        // Collect direct children: both text layers and frames
        n.children?.forEach((child: any) => {
          if (child.type === "TEXT" && child.name?.startsWith("#")) {
            childIds.push(child.id);
          } else if (
            (child.type === "FRAME" || child.type === "GROUP") &&
            child.layoutMode &&
            child.layoutMode !== "NONE"
          ) {
            if (hasTextLayerDescendant(child)) {
              childFrameIds.push(child.id);
            }
          }
        });

        // Store frame with both text children and child frames
        frames[n.id] = {
          id: n.id,
          name: n.name,
          absoluteBoundingBox: n.absoluteBoundingBox,
          layoutMode: n.layoutMode,
          primaryAxisAlignItems: n.primaryAxisAlignItems,
          counterAxisAlignItems: n.counterAxisAlignItems,
          primaryAxisSizingMode: n.primaryAxisSizingMode,
          counterAxisSizingMode: n.counterAxisSizingMode,
          itemSpacing: n.itemSpacing,
          paddingLeft: n.paddingLeft,
          paddingRight: n.paddingRight,
          paddingTop: n.paddingTop,
          paddingBottom: n.paddingBottom,
          layoutPositioning: n.layoutPositioning,
          layoutAlign: n.layoutAlign,
          layoutGrow: n.layoutGrow,
          constraints: n.constraints,
          effects: n.effects, // Include effects (drop shadows, etc.)
          fills: n.fills, // Include background fills
          children: childIds,
          childFrames: childFrameIds,
        };
      }
    }

    // Traverse children
    if (n.children) {
      n.children.forEach((child: any) => traverse(child));
    }
  }

  traverse(node);
  return frames;
}
