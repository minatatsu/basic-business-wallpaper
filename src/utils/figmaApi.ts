import { FIGMA_CONFIG, TEMPLATES } from "../types";

// ローカルテンプレートデータの基本パス
const TEMPLATE_BASE_PATH = "/templates";

// テンプレートインデックスの型定義
interface TemplateIndexEntry {
  nodeId: string;
  imageFile: string;
  dataFile: string;
  width: number;
  height: number;
}

// キャッシュ
let templateIndexCache: Record<string, TemplateIndexEntry> | null = null;
const templateDataCache: Record<string, any> = {};
const imageDataCache: Record<string, string> = {};

/**
 * テンプレートインデックスを取得
 */
async function loadTemplateIndex(): Promise<Record<string, TemplateIndexEntry>> {
  if (templateIndexCache) {
    return templateIndexCache;
  }

  const response = await fetch(`${TEMPLATE_BASE_PATH}/index.json`);
  if (!response.ok) {
    throw new Error(`Failed to load template index: ${response.status}`);
  }

  templateIndexCache = await response.json();
  return templateIndexCache!;
}

/**
 * テンプレートIDからnodeIdを取得するマッピング
 */
function getTemplateIdByNodeId(nodeId: string): string | null {
  const normalizedNodeId = nodeId.replace(":", "-");
  const template = TEMPLATES.find(t => t.nodeId === normalizedNodeId);
  return template?.id || null;
}

/**
 * 画像をBase64形式で取得（ローカルから）
 */
export async function fetchFigmaImageUrls(
  nodeIds: string[],
): Promise<Record<string, string>> {
  console.log(`[FigmaAPI] Loading local images for ${nodeIds.length} nodes...`);

  const index = await loadTemplateIndex();
  const result: Record<string, string> = {};

  for (const nodeId of nodeIds) {
    const normalizedNodeId = nodeId.replace(":", "-");
    const templateId = getTemplateIdByNodeId(normalizedNodeId);

    if (!templateId) {
      console.warn(`[FigmaAPI] Unknown template for nodeId: ${nodeId}`);
      continue;
    }

    const entry = index[templateId];
    if (!entry) {
      console.warn(`[FigmaAPI] No index entry for template: ${templateId}`);
      continue;
    }

    // キャッシュチェック
    if (imageDataCache[nodeId]) {
      result[nodeId] = imageDataCache[nodeId];
      continue;
    }

    try {
      const imagePath = `${TEMPLATE_BASE_PATH}/${entry.imageFile}`;
      console.log(`[FigmaAPI] Loading image: ${imagePath}`);

      const response = await fetch(imagePath);
      if (!response.ok) {
        console.error(`[FigmaAPI] Failed to load image for ${templateId}: ${response.status}`);
        continue;
      }

      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      imageDataCache[nodeId] = base64;
      result[nodeId] = base64;
      console.log(`[FigmaAPI] ✓ Loaded ${templateId} image`);
    } catch (error) {
      console.error(`[FigmaAPI] Error loading image for ${templateId}:`, error);
    }
  }

  console.log(`[FigmaAPI] ✓ Loaded ${Object.keys(result).length} images`);
  return result;
}

/**
 * ノードデータを取得（ローカルから）
 */
export async function fetchFigmaNodes(nodeIds: string[]): Promise<any> {
  console.log(`[FigmaAPI] Loading local node data for ${nodeIds.length} nodes...`);

  const index = await loadTemplateIndex();
  const result: Record<string, any> = {};

  for (const nodeId of nodeIds) {
    const normalizedNodeId = nodeId.replace(":", "-");
    const templateId = getTemplateIdByNodeId(normalizedNodeId);

    if (!templateId) {
      console.warn(`[FigmaAPI] Unknown template for nodeId: ${nodeId}`);
      continue;
    }

    const entry = index[templateId];
    if (!entry) {
      console.warn(`[FigmaAPI] No index entry for template: ${templateId}`);
      continue;
    }

    // キャッシュチェック
    if (templateDataCache[nodeId]) {
      result[nodeId] = templateDataCache[nodeId];
      continue;
    }

    try {
      const dataPath = `${TEMPLATE_BASE_PATH}/${entry.dataFile}`;
      console.log(`[FigmaAPI] Loading data: ${dataPath}`);

      const response = await fetch(dataPath);
      if (!response.ok) {
        console.error(`[FigmaAPI] Failed to load data for ${templateId}: ${response.status}`);
        continue;
      }

      const data = await response.json();

      // ローカルデータはすでに処理済みなので、document構造をラップ
      const wrappedData = {
        document: {
          absoluteBoundingBox: {
            x: 0,
            y: 0,
            width: data.width,
            height: data.height
          },
          // テキストレイヤーとフレームを子要素として構造化
          children: [],
          // 直接データを渡すためのカスタムフィールド
          _processedData: data
        }
      };

      templateDataCache[nodeId] = wrappedData;
      result[nodeId] = wrappedData;
      console.log(`[FigmaAPI] ✓ Loaded ${templateId} data`);
    } catch (error) {
      console.error(`[FigmaAPI] Error loading data for ${templateId}:`, error);
    }
  }

  console.log(`[FigmaAPI] ✓ Loaded ${Object.keys(result).length} nodes`);
  return result;
}

/**
 * テキストレイヤーを検出（ローカルデータから）
 */
export function findTextLayers(node: any, prefix = "#"): Record<string, any> {
  // ローカルデータの場合、すでに処理済みのデータがある
  if (node._processedData?.textLayers) {
    return node._processedData.textLayers;
  }

  // フォールバック：従来の走査ロジック
  const textLayers: Record<string, any> = {};

  function traverse(n: any, parent: any = null) {
    if (!n) return;

    if (n.type === "TEXT" && n.name?.startsWith(prefix)) {
      const fieldName = n.name.substring(prefix.length);
      textLayers[fieldName] = {
        ...n,
        layoutGrow: n.layoutGrow,
        layoutAlign: n.layoutAlign,
        layoutPositioning: n.layoutPositioning,
        constraints: n.constraints,
        effects: n.effects,
        parentId: parent?.id,
      };
    }

    if (n.children) {
      n.children.forEach((child: any) => traverse(child, n));
    }
  }

  traverse(node);
  return textLayers;
}

/**
 * 自動レイアウトフレームを検出（ローカルデータから）
 */
export function findAutoLayoutFrames(
  node: any,
  textLayerIds: Set<string>,
): Record<string, any> {
  // ローカルデータの場合、すでに処理済みのデータがある
  if (node._processedData?.frames) {
    return node._processedData.frames;
  }

  // フォールバック：従来の走査ロジック
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

    if (
      (n.type === "FRAME" || n.type === "GROUP") &&
      n.layoutMode &&
      n.layoutMode !== "NONE"
    ) {
      const hasRelevantChildren = hasTextLayerDescendant(n);

      if (hasRelevantChildren) {
        const childIds: string[] = [];
        const childFrameIds: string[] = [];

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
          effects: n.effects,
          fills: n.fills,
          children: childIds,
          childFrames: childFrameIds,
        };
      }
    }

    if (n.children) {
      n.children.forEach((child: any) => traverse(child));
    }
  }

  traverse(node);
  return frames;
}

// 後方互換性のためにエクスポート（使用されていない場合でも）
export function wrapImageUrl(figmaUrl: string): string {
  // ローカルモードでは不要だが、インターフェース互換性のため残す
  return figmaUrl;
}
