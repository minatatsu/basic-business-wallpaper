#!/usr/bin/env node

/**
 * Figma APIからテンプレートデータを取得してローカルに保存するスクリプト
 *
 * 使用方法:
 * node scripts/fetch-figma-data.mjs
 *
 * 環境変数:
 * FIGMA_ACCESS_TOKEN - Figma Personal Access Token
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .envファイルを読み込む
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
  console.log('[Setup] Loaded .env file');
}

// Figma設定
const FIGMA_CONFIG = {
  fileKey: "Tz8aQ9p4SrqCtVT4UEeNa1",
  accessToken: process.env.FIGMA_ACCESS_TOKEN
};

if (!FIGMA_CONFIG.accessToken) {
  console.error('Error: FIGMA_ACCESS_TOKEN environment variable is required');
  console.error('Usage: FIGMA_ACCESS_TOKEN=your_token node scripts/fetch-figma-data.mjs');
  process.exit(1);
}

// テンプレート定義
const TEMPLATES = [
  { id: "basic", nodeId: "41-6091" },
  { id: "oudan", nodeId: "58-6635" },
  { id: "run", nodeId: "95-818" },
  { id: "ferretall", nodeId: "439-5172" },
  { id: "ferretone", nodeId: "95-878" },
  { id: "ferretSOL", nodeId: "95-933" },
  { id: "ferretMedia", nodeId: "95-997" },
];

// 出力ディレクトリ
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'templates');

async function fetchFigmaImages(nodeIds) {
  const ids = nodeIds.join(',');
  const url = `https://api.figma.com/v1/images/${FIGMA_CONFIG.fileKey}?ids=${ids}&format=png&scale=2`;

  console.log(`[Figma] Fetching images for ${nodeIds.length} nodes...`);

  const response = await fetch(url, {
    headers: {
      'X-Figma-Token': FIGMA_CONFIG.accessToken
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch images: ${response.status} - ${text}`);
  }

  const data = await response.json();

  if (data.err) {
    throw new Error(`Figma API error: ${data.err}`);
  }

  return data.images || {};
}

async function fetchFigmaNodes(nodeIds) {
  const ids = nodeIds.join(',');
  const url = `https://api.figma.com/v1/files/${FIGMA_CONFIG.fileKey}/nodes?ids=${ids}`;

  console.log(`[Figma] Fetching nodes for ${nodeIds.length} nodes...`);

  const response = await fetch(url, {
    headers: {
      'X-Figma-Token': FIGMA_CONFIG.accessToken
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch nodes: ${response.status} - ${text}`);
  }

  const data = await response.json();

  if (data.err) {
    throw new Error(`Figma API error: ${data.err}`);
  }

  return data.nodes || {};
}

async function downloadImage(url, outputPath) {
  console.log(`[Download] ${path.basename(outputPath)}...`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  fs.writeFileSync(outputPath, buffer);
  console.log(`[Download] ✓ Saved ${path.basename(outputPath)} (${Math.round(buffer.length / 1024)}KB)`);
}

function findTextLayers(node, prefix = '#') {
  const textLayers = {};

  function traverse(n, parent = null) {
    if (!n) return;

    if (n.type === 'TEXT' && n.name?.startsWith(prefix)) {
      const fieldName = n.name.substring(prefix.length);
      textLayers[fieldName] = {
        id: n.id,
        name: n.name,
        absoluteBoundingBox: n.absoluteBoundingBox,
        style: n.style,
        fills: n.fills,
        effects: n.effects,
        layoutGrow: n.layoutGrow,
        layoutAlign: n.layoutAlign,
        layoutPositioning: n.layoutPositioning,
        constraints: n.constraints,
        parentId: parent?.id
      };
    }

    if (n.children) {
      n.children.forEach(child => traverse(child, n));
    }
  }

  traverse(node);
  return textLayers;
}

function hasTextLayerDescendant(n) {
  if (!n) return false;
  if (n.type === 'TEXT' && n.name?.startsWith('#')) return true;
  if (n.children) {
    return n.children.some(child => hasTextLayerDescendant(child));
  }
  return false;
}

function findAutoLayoutFrames(node) {
  const frames = {};

  function traverse(n) {
    if (!n) return;

    if ((n.type === 'FRAME' || n.type === 'GROUP') && n.layoutMode && n.layoutMode !== 'NONE') {
      const hasRelevantChildren = hasTextLayerDescendant(n);

      if (hasRelevantChildren) {
        const childIds = [];
        const childFrameIds = [];

        n.children?.forEach(child => {
          if (child.type === 'TEXT' && child.name?.startsWith('#')) {
            childIds.push(child.id);
          } else if ((child.type === 'FRAME' || child.type === 'GROUP') && child.layoutMode && child.layoutMode !== 'NONE') {
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
          childFrames: childFrameIds
        };
      }
    }

    if (n.children) {
      n.children.forEach(child => traverse(child));
    }
  }

  traverse(node);
  return frames;
}

function processNodeData(nodeData, rootBoundingBox) {
  const textLayers = findTextLayers(nodeData);
  const frames = findAutoLayoutFrames(nodeData);

  // テキストレイヤーの座標を相対座標に変換
  const processedTextLayers = {};
  for (const [key, layer] of Object.entries(textLayers)) {
    const box = layer.absoluteBoundingBox;
    processedTextLayers[key] = {
      id: layer.id,
      name: layer.name,
      x: box.x - rootBoundingBox.x,
      y: box.y - rootBoundingBox.y,
      width: box.width,
      height: box.height,
      fontSize: layer.style?.fontSize || 16,
      fontWeight: layer.style?.fontWeight || 400,
      fontFamily: layer.style?.fontFamily || 'Inter',
      textAlignHorizontal: layer.style?.textAlignHorizontal || 'LEFT',
      textAlignVertical: layer.style?.textAlignVertical || 'TOP',
      fills: layer.fills || [],
      lineHeight: layer.style?.lineHeightPx || layer.style?.lineHeightPercent || 'AUTO',
      effects: layer.effects || [],
      layoutGrow: layer.layoutGrow,
      layoutAlign: layer.layoutAlign,
      layoutPositioning: layer.layoutPositioning,
      constraints: layer.constraints,
      parentId: layer.parentId
    };
  }

  // フレームの座標を相対座標に変換
  const processedFrames = {};
  for (const [key, frame] of Object.entries(frames)) {
    const box = frame.absoluteBoundingBox;
    processedFrames[key] = {
      id: frame.id,
      name: frame.name,
      x: box.x - rootBoundingBox.x,
      y: box.y - rootBoundingBox.y,
      width: box.width,
      height: box.height,
      layoutMode: frame.layoutMode,
      primaryAxisAlignItems: frame.primaryAxisAlignItems,
      counterAxisAlignItems: frame.counterAxisAlignItems,
      primaryAxisSizingMode: frame.primaryAxisSizingMode,
      counterAxisSizingMode: frame.counterAxisSizingMode,
      itemSpacing: frame.itemSpacing,
      paddingLeft: frame.paddingLeft,
      paddingRight: frame.paddingRight,
      paddingTop: frame.paddingTop,
      paddingBottom: frame.paddingBottom,
      layoutPositioning: frame.layoutPositioning,
      layoutAlign: frame.layoutAlign,
      layoutGrow: frame.layoutGrow,
      constraints: frame.constraints,
      effects: frame.effects,
      fills: frame.fills,
      children: frame.children,
      childFrames: frame.childFrames
    };
  }

  return {
    textLayers: processedTextLayers,
    frames: processedFrames,
    width: rootBoundingBox.width,
    height: rootBoundingBox.height
  };
}

async function main() {
  console.log('===========================================');
  console.log('Figma Template Data Fetcher');
  console.log('===========================================\n');

  // 出力ディレクトリ作成
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`[Setup] Created output directory: ${OUTPUT_DIR}\n`);
  }

  const nodeIds = TEMPLATES.map(t => t.nodeId);

  try {
    // 1. 画像URLを取得
    console.log('Step 1: Fetching image URLs from Figma...');
    const imageUrls = await fetchFigmaImages(nodeIds);
    console.log(`[Figma] ✓ Got ${Object.keys(imageUrls).length} image URLs\n`);

    // 2. ノードデータを取得
    console.log('Step 2: Fetching node data from Figma...');
    const nodesData = await fetchFigmaNodes(nodeIds);
    console.log(`[Figma] ✓ Got ${Object.keys(nodesData).length} nodes\n`);

    // 3. 各テンプレートを処理
    console.log('Step 3: Processing and saving templates...\n');

    const templateIndex = {};

    for (const template of TEMPLATES) {
      console.log(`[Template] Processing ${template.id}...`);

      const nodeIdWithColon = template.nodeId.replace('-', ':');
      const imageUrl = imageUrls[nodeIdWithColon];
      const nodeData = nodesData[nodeIdWithColon];

      if (!imageUrl) {
        console.error(`[Template] ✗ No image URL for ${template.id}`);
        continue;
      }

      if (!nodeData) {
        console.error(`[Template] ✗ No node data for ${template.id}`);
        continue;
      }

      // 画像をダウンロード
      const imagePath = path.join(OUTPUT_DIR, `${template.id}.png`);
      await downloadImage(imageUrl, imagePath);

      // ノードデータを処理
      const document = nodeData.document;
      const rootBoundingBox = document.absoluteBoundingBox;
      const processedData = processNodeData(document, rootBoundingBox);

      // JSONを保存
      const jsonPath = path.join(OUTPUT_DIR, `${template.id}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(processedData, null, 2));
      console.log(`[Template] ✓ Saved ${template.id}.json\n`);

      // インデックスに追加
      templateIndex[template.id] = {
        nodeId: template.nodeId,
        imageFile: `${template.id}.png`,
        dataFile: `${template.id}.json`,
        width: processedData.width,
        height: processedData.height
      };
    }

    // 4. インデックスファイルを保存
    const indexPath = path.join(OUTPUT_DIR, 'index.json');
    fs.writeFileSync(indexPath, JSON.stringify(templateIndex, null, 2));
    console.log('===========================================');
    console.log(`[Done] ✓ Saved template index to ${indexPath}`);
    console.log(`[Done] ✓ All templates saved to ${OUTPUT_DIR}`);
    console.log('===========================================');

  } catch (error) {
    console.error('\n[Error]', error.message);
    process.exit(1);
  }
}

main();
