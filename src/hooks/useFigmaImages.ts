import { useState, useEffect } from "react";
import {
  fetchFigmaImageUrls,
  fetchFigmaNodes,
  findTextLayers,
  findAutoLayoutFrames,
} from "../utils/figmaApi";
import {
  TEMPLATES,
  TemplateData,
  TextLayerInfo,
  FrameLayoutInfo,
} from "../types";

export function useFigmaImages(shouldLoad: boolean = true) {
  const [templateData, setTemplateData] = useState<
    Record<string, TemplateData>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldLoad) {
      setLoading(true);
      return;
    }

    let cancelled = false;

    async function loadTemplates() {
      try {
        setLoading(true);
        const nodeIds = TEMPLATES.map((t) => t.nodeId);

        console.log("Starting to load templates from local data...");

        // Fetch images and nodes from local storage
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  "Request timed out - please check your connection and try again",
                ),
              ),
            30000, // 30秒タイムアウト（ローカルなので短め）
          ),
        );

        const [urls, nodes] = (await Promise.race([
          Promise.all([fetchFigmaImageUrls(nodeIds), fetchFigmaNodes(nodeIds)]),
          timeoutPromise,
        ])) as [Record<string, string>, any];

        if (cancelled) return;

        console.log("✓ Successfully loaded local template data");

        // Map node IDs to template IDs
        const mappedData: Record<string, TemplateData> = {};

        TEMPLATES.forEach((template) => {
          // Try both formats: with colon and with dash
          const nodeIdWithColon = template.nodeId.replace("-", ":");
          const nodeIdWithDash = template.nodeId;

          // Get image URL (base64 data URL from local file)
          let imageUrl = urls[nodeIdWithColon] || urls[nodeIdWithDash];
          console.log(`Template ${template.id}:`, {
            nodeIdWithColon,
            nodeIdWithDash,
            hasImage: !!imageUrl,
          });
          if (!imageUrl) {
            console.warn(
              `No image URL found for template ${template.id} (node: ${template.nodeId})`,
            );
            return;
          }

          // Get node structure
          const nodeData = nodes[nodeIdWithColon] || nodes[nodeIdWithDash];
          if (!nodeData || !nodeData.document) {
            console.warn(`No node data found for template ${template.id}`);
            return;
          }

          // ローカルデータはすでに処理済みかどうかをチェック
          const isLocalProcessedData = !!nodeData.document._processedData;

          // Get frame dimensions
          const frameBox = nodeData.document.absoluteBoundingBox;
          const frameWidth = frameBox?.width || 1920;
          const frameHeight = frameBox?.height || 1080;

          let textLayers: Record<string, TextLayerInfo>;
          let frames: Record<string, FrameLayoutInfo>;

          if (isLocalProcessedData) {
            // ローカルデータ：すでに処理済み
            const processedData = nodeData.document._processedData;
            textLayers = processedData.textLayers || {};
            frames = processedData.frames || {};
            console.log(`✓ Using pre-processed local data for ${template.id}`);
          } else {
            // Figma APIからの生データ：変換処理が必要
            const textLayersRaw = findTextLayers(nodeData.document);
            const textLayerIds = new Set(
              Object.values(textLayersRaw).map((l: any) => l.id),
            );
            const framesRaw = findAutoLayoutFrames(
              nodeData.document,
              textLayerIds,
            );

            // Convert to TextLayerInfo format
            textLayers = {};
            Object.entries(textLayersRaw).forEach(
              ([fieldName, layer]: [string, any]) => {
                const box = layer.absoluteBoundingBox;
                if (!box) return;

                const relativeX = box.x - (frameBox?.x || 0);
                const relativeY = box.y - (frameBox?.y || 0);

                const style = layer.style || {};
                const fills = layer.fills || [];

                let lineHeight: any;
                if (style.lineHeightPx) {
                  lineHeight = { unit: "PIXELS", value: style.lineHeightPx };
                } else if (style.lineHeightPercentFontSize) {
                  lineHeight = {
                    unit: "PERCENT",
                    value: style.lineHeightPercentFontSize,
                  };
                } else {
                  lineHeight = { unit: "AUTO" };
                }

                textLayers[fieldName] = {
                  id: layer.id,
                  name: layer.name,
                  x: relativeX,
                  y: relativeY,
                  width: box.width,
                  height: box.height,
                  fontSize: style.fontSize || 16,
                  fontWeight: style.fontWeight || 400,
                  fontFamily: style.fontFamily || "sans-serif",
                  textAlignHorizontal: style.textAlignHorizontal || "LEFT",
                  textAlignVertical: style.textAlignVertical || "TOP",
                  fills: fills,
                  lineHeight: lineHeight,
                  effects: layer.effects || [],
                  layoutGrow: layer.layoutGrow,
                  layoutAlign: layer.layoutAlign,
                  layoutPositioning: layer.layoutPositioning,
                  constraints: layer.constraints,
                  parentId: layer.parentId,
                };
              },
            );

            // Convert to FrameLayoutInfo format
            frames = {};
            Object.entries(framesRaw).forEach(
              ([frameId, frame]: [string, any]) => {
                const box = frame.absoluteBoundingBox;
                if (!box) return;

                const relativeX = box.x - (frameBox?.x || 0);
                const relativeY = box.y - (frameBox?.y || 0);

                frames[frameId] = {
                  id: frame.id,
                  name: frame.name,
                  x: relativeX,
                  y: relativeY,
                  width: box.width,
                  height: box.height,
                  layoutMode: frame.layoutMode,
                  primaryAxisAlignItems: frame.primaryAxisAlignItems,
                  counterAxisAlignItems: frame.counterAxisAlignItems,
                  primaryAxisSizingMode: frame.primaryAxisSizingMode,
                  counterAxisSizingMode: frame.counterAxisSizingMode,
                  itemSpacing: frame.itemSpacing || 0,
                  paddingLeft: frame.paddingLeft || 0,
                  paddingRight: frame.paddingRight || 0,
                  paddingTop: frame.paddingTop || 0,
                  paddingBottom: frame.paddingBottom || 0,
                  layoutPositioning: frame.layoutPositioning,
                  layoutAlign: frame.layoutAlign,
                  layoutGrow: frame.layoutGrow,
                  constraints: frame.constraints,
                  effects: frame.effects || [],
                  fills: frame.fills || [],
                  children: frame.children || [],
                  childFrames: frame.childFrames || [],
                };
              },
            );
          }

          mappedData[template.id] = {
            imageUrl,
            textLayers,
            frames,
            width: frameWidth,
            height: frameHeight,
          };
        });

        if (cancelled) return;

        console.log(`✓ Loaded ${Object.keys(mappedData).length} templates`);
        setTemplateData(mappedData);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load templates:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load templates",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTemplates();

    return () => {
      cancelled = true;
    };
  }, [shouldLoad]);

  return { templateData, loading, error };
}
