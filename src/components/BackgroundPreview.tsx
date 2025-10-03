import { FormData, TEMPLATES, TextLayerInfo, FrameLayoutInfo } from "../types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card } from "./ui/card";
import { useEffect, useRef, useState, useMemo, JSX } from "react";
import { useLoading } from "../context/LoadingContext";
import { Skeleton } from "./ui/skeleton";
import { renderInfoFrame } from "./BackgroundPreview_new";

interface TemplateDataType {
  imageUrl: string;
  textLayers: Record<string, TextLayerInfo>;
  frames: Record<string, FrameLayoutInfo>;
  width: number;
  height: number;
}

interface BackgroundPreviewProps {
  formData: FormData;
  activeTemplate?: string;
  onTemplateChange?: (templateId: string) => void;
}

// Helper to calculate line height value
function getLineHeight(lineHeight: any, fontSize: number): number | string {
  if (!lineHeight) return 1.2; // Default

  if (lineHeight.unit === "PIXELS") {
    return lineHeight.value / fontSize; // Convert to unitless ratio
  } else if (lineHeight.unit === "PERCENT") {
    return lineHeight.value / 100; // Convert to unitless ratio
  } else if (lineHeight.unit === "AUTO") {
    return 1.2; // Default auto line height
  }

  return 1.2; // Fallback
}

export function BackgroundPreview({
  formData,
  activeTemplate,
  onTemplateChange,
}: BackgroundPreviewProps) {
  const selectedTemplates = TEMPLATES.filter((t) =>
    formData.selected_templates.includes(t.id),
  );
  const currentTemplate =
    activeTemplate || selectedTemplates[0]?.id || TEMPLATES[0].id;
  const { templateData, isLoading: loading, error } = useLoading();

  if (loading) {
    return (
      <div className="space-y-4">
        <h3>プレビュー</h3>
        <Skeleton className="w-full aspect-video" />
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Figmaテンプレートを読み込み中...
          </p>
          <p className="text-xs text-muted-foreground">
            初回読み込みには時間がかかる場合があります
          </p>
          <p className="text-xs text-amber-500 mt-2">
            [DEBUG] Loading templates...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h3>プレビュー</h3>
        <Card className="w-full aspect-video flex items-center justify-center bg-muted">
          <div className="text-center p-4 max-w-md">
            <p className="text-destructive mb-2">
              テンプレートの読み込みに失敗しました
            </p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <p className="text-xs text-muted-foreground">
              ページを再読み込みしてもう一度お試しください
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (selectedTemplates.length === 0) {
    return (
      <Card className="w-full aspect-video flex items-center justify-center bg-muted">
        <p className="text-muted-foreground">テンプレートを選択してください</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3>プレビュー</h3>
      <Tabs value={currentTemplate} onValueChange={onTemplateChange}>
        {selectedTemplates.length > 1 && (
          <TabsList
            className="grid w-full"
            style={{
              gridTemplateColumns: `repeat(${selectedTemplates.length}, 1fr)`,
            }}
          >
            {selectedTemplates.map((template) => (
              <TabsTrigger key={template.id} value={template.id}>
                {template.displayName}
              </TabsTrigger>
            ))}
          </TabsList>
        )}
        {selectedTemplates.map((template) => (
          <TabsContent key={template.id} value={template.id} className="mt-4">
            <TemplatePreviewCanvas
              formData={formData}
              templateId={template.id}
              templateData={templateData[template.id]}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Hidden canvases for download - fixed size 1920x1080 */}
      <div style={{ position: "fixed", left: "-9999px", top: 0 }}>
        {selectedTemplates.map((template) => (
          <TemplateDownloadCanvas
            key={`download-${template.id}`}
            formData={formData}
            templateId={template.id}
            templateData={templateData[template.id]}
          />
        ))}
      </div>
    </div>
  );
}

// Helper to get color from Figma fills
const getFillColor = (fills: any[]): string => {
  if (!fills || fills.length === 0) return "#ffffff";

  const fill = fills[0];
  if (fill.type === "SOLID" && fill.color) {
    const { r, g, b } = fill.color;
    const opacity = fill.opacity !== undefined ? fill.opacity : 1;
    return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(
      b * 255,
    )}, ${opacity})`;
  }

  return "#ffffff";
};

// Helper to render a single text field
function renderSingleTextField(
  fieldName: string,
  layerInfo: TextLayerInfo,
  formData: FormData,
  scale: number = 1,
  parentFrameName?: string,
  isForDownload: boolean = false,
  gapToNext: number = 0,
  flexDirection: "row" | "column" = "column",
) {
  const value = formData[fieldName as keyof FormData];
  if (!value || typeof value !== "string" || value.trim() === "") return null;

  // Convert to uppercase for English name fields
  const displayValue =
    fieldName === "last_name_en" || fieldName === "first_name_en"
      ? value.toUpperCase()
      : value;

  // Force right alignment for text in name/profile related layers
  const forceRightAlign =
    fieldName.includes("name") ||
    fieldName.includes("department") ||
    fieldName.includes("group") ||
    fieldName.includes("role");
  const textAlign = forceRightAlign
    ? "right"
    : layerInfo.textAlignHorizontal.toLowerCase();

  // Use layoutGrow if available
  const flexGrow =
    layerInfo.layoutGrow !== undefined && layerInfo.layoutGrow > 0
      ? layerInfo.layoutGrow
      : undefined;

  // Use layoutAlign if available
  const alignSelf =
    layerInfo.layoutAlign === "STRETCH"
      ? "stretch"
      : layerInfo.layoutAlign === "CENTER"
        ? "center"
        : layerInfo.layoutAlign === "MAX"
          ? "flex-end"
          : layerInfo.layoutAlign === "MIN"
            ? "flex-start"
            : undefined;

  // Force line-height to 1 for name fields (Japanese and Roman)
  const parentNameLower = parentFrameName?.toLowerCase() || "";
  const isNameField =
    fieldName.includes("name_jp") || fieldName.includes("name_en");
  const isInNameFrame =
    parentNameLower.includes("54262") || parentNameLower.includes("54263");
  const forceLineHeight1 = isNameField && isInNameFrame;

  // Apply letter-spacing: 10% (0.1em) for name fields (Japanese and Roman)
  const letterSpacing = isNameField ? "0.1em" : "normal";

  // Apply white text shadow for glow effect (text outline)
  const textShadow =
    "0 0 8px rgba(255, 255, 255, 0.8), 0 0 16px rgba(255, 255, 255, 0.6), 0 0 24px rgba(255, 255, 255, 0.4)";

  // Apply margin based on gap and flex direction
  const gapMargin =
    gapToNext > 0
      ? flexDirection === "row"
        ? { marginRight: `${gapToNext}px` }
        : { marginBottom: `${gapToNext}px` }
      : {};

  return (
    <div
      key={fieldName}
      style={{
        fontSize: `${layerInfo.fontSize * scale}px`,
        fontWeight: layerInfo.fontWeight,
        fontFamily: '"Noto Sans JP", sans-serif',
        color: getFillColor(layerInfo.fills),
        textAlign: textAlign as any,
        lineHeight: forceLineHeight1
          ? 1
          : getLineHeight(layerInfo.lineHeight, layerInfo.fontSize),
        letterSpacing,
        textShadow,
        whiteSpace: "nowrap",
        flexGrow,
        flexShrink: 0,
        alignSelf,
        ...gapMargin,
      }}
    >
      {displayValue}
    </div>
  );
}

// Helper to render a frame with auto-layout (supports nested frames)
function renderAutoLayoutFrame(
  frame: FrameLayoutInfo,
  textLayers: Record<string, TextLayerInfo>,
  frames: Record<string, FrameLayoutInfo>,
  formData: FormData,
  scale: number = 1,
  containerWidth: number = 1920,
  isNested: boolean = false,
  depth: number = 0,
  isForDownload: boolean = false,
) {
  // Prevent infinite recursion
  if (depth > 10) {
    console.warn("Max nesting depth reached for frame:", frame.name);
    return null;
  }

  // Find all text layers that belong to this frame and filter out empty ones
  const frameTextLayers = Object.entries(textLayers)
    .filter(([_, layer]) => frame.children.includes(layer.id))
    .filter(([fieldName, _]) => {
      const value = formData[fieldName as keyof FormData];
      return value && typeof value === "string" && value.trim() !== "";
    })
    .sort((a, b) => {
      // Sort by position based on layout mode
      if (frame.layoutMode === "HORIZONTAL") {
        return a[1].x - b[1].x;
      } else {
        const sortValue = a[1].y - b[1].y;

        // Frame 54269のテキストレイヤーは通常の順序（横並びを保つ）
        return sortValue;
      }
    });

  // Find child frames (avoid circular references)
  const childFrames = (frame.childFrames || [])
    .map((childId) => frames[childId])
    .filter(Boolean)
    .filter((childFrame) => childFrame.id !== frame.id) // Prevent self-reference
    .sort((a, b) => {
      // Sort by position based on layout mode
      if (frame.layoutMode === "HORIZONTAL") {
        return a.x - b.x;
      } else {
        const sortValue = a.y - b.y;
        // Frame 54269の子フレーム（行）は逆順にする
        // ただし各行内の横並び要素は通常の順序を保つ
        return frameName.includes("54269") ? -sortValue : sortValue;
      }
    });

  // Filter out empty child frames (frames where all text fields are empty)
  const nonEmptyChildFrames = childFrames.filter((childFrame) => {
    // Check if this child frame has any direct text layers with content
    const hasDirectText = childFrame.children.some((childId) => {
      const textLayer = Object.entries(textLayers).find(
        ([_, layer]) => layer.id === childId,
      );
      if (!textLayer) return false;

      const [fieldName] = textLayer;
      const value = formData[fieldName as keyof FormData];
      return value && typeof value === "string" && value.trim() !== "";
    });

    // Or check if any nested child frames have content (recursive check)
    const hasNestedContent = (childFrame.childFrames || []).length > 0;

    return hasDirectText || hasNestedContent;
  });

  // If no content, don't render
  if (frameTextLayers.length === 0 && nonEmptyChildFrames.length === 0) {
    return null;
  }

  const flexDirection = frame.layoutMode === "HORIZONTAL" ? "row" : "column";

  // Get frame name once to avoid duplicate declarations
  const frameName = frame.name.toLowerCase();
  const frameId = frame.id.toLowerCase();

  // Determine default gap based on frame name and layout mode
  const getDefaultGap = () => {
    // Japanese name frame (姓名): 64px gap
    if (frameName.includes("54262")) return 64;

    // Roman name frame (TANAKA TARO): 48px gap
    if (frameName.includes("54263")) return 48;

    // Department frame: 8px gap
    if (frameName.includes("54269")) return 0;

    // Frame 1 (container for Japanese and Roman names): ダウンロード時は広めに
    if (frameName === "frame 1") return 48;

    // Name frame (container for Frame1): minimal gap
    if (frameName === "name") return 0;

    // Profile frame: 30px gap between Name and Team
    if (frameName === "profile") return 30;

    // Info frame (parent container): minimal spacing
    if (frameName === "info") return 0;

    // Default vertical spacing
    if (frame.layoutMode === "VERTICAL") return 0;

    // Default horizontal spacing
    return 0;
  };

  const defaultGap = getDefaultGap();

  // Use the default gap calculation for all frames
  // ダウンロード時のFrame 1は強制的にdefaultGapを使用
  const gap =
    frameName === "frame 1" && isForDownload
      ? defaultGap * scale
      : (frame.itemSpacing !== undefined ? frame.itemSpacing : defaultGap) *
        scale;

  // Determine horizontal positioning based on constraints
  const constraints = frame.constraints;

  // Force right alignment for info frame and all name/profile related frames
  const isRightAligned =
    constraints?.horizontal === "RIGHT" ||
    frame.primaryAxisAlignItems === "MAX" ||
    frame.counterAxisAlignItems === "MAX" ||
    frameName === "info" ||
    frameName === "profile" ||
    frameName === "name" ||
    frameName === "team" ||
    frameName.includes("frame");

  const isCenterAligned =
    !isRightAligned && constraints?.horizontal === "CENTER";
  const isScaleAligned =
    constraints?.horizontal === "LEFT_RIGHT" ||
    constraints?.horizontal === "SCALE";

  // Calculate position
  const frameRight = containerWidth - (frame.x + frame.width);
  const frameLeft = frame.x;
  const frameCenterX = frame.x + frame.width / 2;

  // Info/Profile frame: 固定位置（top: 120px, right: 88px）
  const isInfoFrame = frameName === "info" || frameName === "profile";

  // For nested frames, use relative positioning with flex properties
  const positionStyle = isNested
    ? {
        position: "relative" as const,
        // Use layoutAlign if available for nested frames
        ...(frame.layoutAlign === "STRETCH" ? { width: "100%" } : {}),
        ...(frame.layoutGrow !== undefined && frame.layoutGrow > 0
          ? { flexGrow: frame.layoutGrow }
          : {}),
      }
    : isInfoFrame
      ? {
          // Info/Profileフレームは固定位置
          position: "absolute" as const,
          top: `${120 * scale}px`,
          right: `${88 * scale}px`,
          left: "auto",
        }
      : {
          position: "absolute" as const,
          ...(isRightAligned
            ? {
                right: `${frameRight * scale}px`,
                left: "auto",
              }
            : isCenterAligned
              ? {
                  left: `${frameCenterX * scale}px`,
                  transform: "translateX(-50%)",
                }
              : {
                  left: `${frameLeft * scale}px`,
                }),
          top: `${frame.y * scale}px`,
          // If scale aligned, potentially adjust width
          ...(isScaleAligned && !isNested
            ? {
                minWidth: `${frame.width * scale}px`,
              }
            : {}),
        };

  // Determine alignment based on primaryAxisAlignItems and counterAxisAlignItems
  const getAlignItems = () => {
    const frameName = frame.name.toLowerCase();

    // Force right alignment (flex-end) for vertical containers
    if (
      frame.layoutMode === "VERTICAL" &&
      (frameName === "info" ||
        frameName === "profile" ||
        frameName === "name" ||
        frameName === "team")
    ) {
      return "flex-end";
    }

    if (frame.counterAxisAlignItems === "CENTER") return "center";
    if (frame.counterAxisAlignItems === "MAX") return "flex-end";
    if (frame.counterAxisAlignItems === "MIN") return "flex-start";
    return "flex-start";
  };

  const getJustifyContent = () => {
    const frameName = frame.name.toLowerCase();

    // Force right alignment (flex-end) for horizontal name rows
    if (
      frame.layoutMode === "HORIZONTAL" &&
      (frameName.includes("54262") || // Japanese name frame
        frameName.includes("54263") || // Roman name frame
        frameName.includes("54269") || // Department frame
        frameName.includes("frame"))
    ) {
      return "flex-end";
    }

    if (frame.primaryAxisAlignItems === "CENTER") return "center";
    if (frame.primaryAxisAlignItems === "SPACE_BETWEEN") return "space-between";
    if (frame.primaryAxisAlignItems === "MAX") return "flex-end";
    if (frame.primaryAxisAlignItems === "MIN") return "flex-start";

    // Default to flex-end for name/profile related frames
    if (
      frameName === "name" ||
      frameName === "profile" ||
      frameName === "team"
    ) {
      return "flex-end";
    }

    return "flex-start";
  };

  // Check if this is a child of the info frame
  const isInfoChild = depth === 1 && frameName !== "info";

  // For download only: move Japanese name frame up by 20px
  const isJapaneseNameFrame = frameName.includes("54262");
  const frameMarginTop =
    isForDownload && isJapaneseNameFrame ? "-20px" : undefined;

  return (
    <div
      key={frame.id}
      style={{
        ...positionStyle,
        display: "flex",
        flexDirection,
        alignItems: getAlignItems(),
        justifyContent: getJustifyContent(),
        paddingLeft: `${(frame.paddingLeft || 0) * scale}px`,
        paddingRight: `${(frame.paddingRight || 0) * scale}px`,
        // Remove vertical padding for direct children of info frame to reduce spacing
        paddingTop: isInfoChild
          ? "0px"
          : `${(frame.paddingTop || 0) * scale}px`,
        paddingBottom: isInfoChild
          ? "0px"
          : `${(frame.paddingBottom || 0) * scale}px`,
        marginTop: frameMarginTop,
      }}
    >
      {/* Render direct text children with margin for spacing */}
      {frameTextLayers.map(([fieldName, layerInfo], index) =>
        renderSingleTextField(
          fieldName,
          layerInfo,
          formData,
          scale,
          frame.name,
          isForDownload,
          index < frameTextLayers.length - 1 || nonEmptyChildFrames.length > 0
            ? gap
            : 0,
          flexDirection,
        ),
      )}

      {/* Render child frames with margin for spacing */}
      {nonEmptyChildFrames.map((childFrame, index) => {
        const childGap = index < nonEmptyChildFrames.length - 1 ? gap : 0;
        const childElement = renderAutoLayoutFrame(
          childFrame,
          textLayers,
          frames,
          formData,
          scale,
          containerWidth,
          true,
          depth + 1,
          isForDownload,
        );

        // Wrap child frame with margin
        if (childGap > 0 && childElement) {
          return (
            <div
              key={childFrame.id}
              style={
                flexDirection === "row"
                  ? { marginRight: `${childGap}px` }
                  : { marginBottom: `${childGap}px` }
              }
            >
              {childElement}
            </div>
          );
        }

        return childElement;
      })}
    </div>
  );
}

// Helper to render text fields (with or without auto-layout)
function renderTextFields(
  textLayers: Record<string, TextLayerInfo>,
  frames: Record<string, FrameLayoutInfo> | undefined,
  formData: FormData,
  scale: number = 1,
  containerWidth: number = 1920,
  isForDownload: boolean = false,
) {
  const elements: JSX.Element[] = [];
  const processedLayerIds = new Set<string>();
  const processedFrameIds = new Set<string>();

  if (!frames || Object.keys(frames).length === 0) {
    // Fallback: render all text layers without auto-layout
    console.log("Rendering without auto-layout frames");
    Object.entries(textLayers).forEach(([fieldName, layerInfo]) => {
      const value = formData[fieldName as keyof FormData];
      if (!value || typeof value !== "string") return;

      // Convert to uppercase for English name fields
      const displayValue =
        fieldName === "last_name_en" || fieldName === "first_name_en"
          ? value.toUpperCase()
          : value;

      const textAlign = layerInfo.textAlignHorizontal.toLowerCase();

      // Force line-height to 1 for name fields
      const isNameField =
        fieldName.includes("name_jp") || fieldName.includes("name_en");

      const lineHeight = isNameField
        ? 1
        : getLineHeight(layerInfo.lineHeight, layerInfo.fontSize);

      // Apply letter-spacing: 10% (0.1em) for name fields
      const letterSpacing = isNameField ? "0.1em" : "normal";

      // Apply white text shadow for glow effect (text outline)
      const textShadow =
        "0 0 8px rgba(255, 255, 255, 0.8), 0 0 16px rgba(255, 255, 255, 0.6), 0 0 24px rgba(255, 255, 255, 0.4)";

      // Check constraints for positioning
      const constraints = layerInfo.constraints;
      const isRightConstrained = constraints?.horizontal === "RIGHT";
      const isCenterConstrained = constraints?.horizontal === "CENTER";

      const layerRight = containerWidth - (layerInfo.x + layerInfo.width);
      const layerCenterX = layerInfo.x + layerInfo.width / 2;

      const positionStyle = isRightConstrained
        ? {
            right: `${layerRight * scale}px`,
            left: "auto",
          }
        : isCenterConstrained
          ? {
              left: `${layerCenterX * scale}px`,
              transform: "translateX(-50%)",
            }
          : {
              left: `${layerInfo.x * scale}px`,
            };

      // Position adjustment for download - ローマ字名を下げる
      const isRomanName = fieldName.includes("name_en");
      const topAdjustment = isForDownload && isRomanName ? 30 : 0; // ダウンロード時はローマ字名を30px下げる
      const topPosition = `${(layerInfo.y + topAdjustment) * scale}px`;

      elements.push(
        <div
          key={fieldName}
          style={{
            position: "absolute",
            ...positionStyle,
            top: topPosition,
            fontSize: `${layerInfo.fontSize * scale}px`,
            fontWeight: layerInfo.fontWeight,
            fontFamily: '"Noto Sans JP", sans-serif',
            color: getFillColor(layerInfo.fills),
            textAlign: textAlign as any,
            lineHeight,
            letterSpacing,
            textShadow,
            whiteSpace: "nowrap",
          }}
        >
          {displayValue}
        </div>,
      );
    });
    return elements;
  }

  // First, identify top-level frames (frames that are not children of other frames)
  const allChildFrameIds = new Set<string>();
  Object.values(frames).forEach((frame) => {
    (frame.childFrames || []).forEach((childId) =>
      allChildFrameIds.add(childId),
    );
  });

  const topLevelFrames = Object.values(frames).filter(
    (frame) => !allChildFrameIds.has(frame.id),
  );

  console.log(`Rendering ${topLevelFrames.length} top-level frames`);

  // Render top-level auto-layout frames
  topLevelFrames.forEach((frame) => {
    try {
      const frameElement = renderAutoLayoutFrame(
        frame,
        textLayers,
        frames,
        formData,
        scale,
        containerWidth,
        false,
        0,
        isForDownload,
      );
      if (frameElement) {
        elements.push(frameElement);
        // Mark all text layers in this frame tree as processed
        const markFrameAsProcessed = (f: FrameLayoutInfo, d: number = 0) => {
          // Prevent infinite recursion
          if (d > 10) {
            console.warn("Max depth reached in markFrameAsProcessed");
            return;
          }

          processedFrameIds.add(f.id);
          f.children.forEach((childId) => processedLayerIds.add(childId));
          (f.childFrames || []).forEach((childFrameId) => {
            const childFrame = frames[childFrameId];
            if (childFrame && !processedFrameIds.has(childFrameId)) {
              markFrameAsProcessed(childFrame, d + 1);
            }
          });
        };
        markFrameAsProcessed(frame);
      }
    } catch (error) {
      console.error("Error rendering frame:", frame.name, error);
    }
  });

  // Then render remaining text layers that are not in auto-layout frames
  Object.entries(textLayers).forEach(([fieldName, layerInfo]) => {
    if (processedLayerIds.has(layerInfo.id)) return;

    const value = formData[fieldName as keyof FormData];
    if (!value || typeof value !== "string") return;

    // Convert to uppercase for English name fields
    const displayValue =
      fieldName === "last_name_en" || fieldName === "first_name_en"
        ? value.toUpperCase()
        : value;

    const textAlign = layerInfo.textAlignHorizontal.toLowerCase();

    // Check constraints for positioning
    const constraints = layerInfo.constraints;
    const isRightConstrained = constraints?.horizontal === "RIGHT";
    const isCenterConstrained = constraints?.horizontal === "CENTER";

    const layerRight = containerWidth - (layerInfo.x + layerInfo.width);
    const layerCenterX = layerInfo.x + layerInfo.width / 2;

    const positionStyle = isRightConstrained
      ? {
          right: `${layerRight * scale}px`,
          left: "auto",
        }
      : isCenterConstrained
        ? {
            left: `${layerCenterX * scale}px`,
            transform: "translateX(-50%)",
          }
        : {
            left: `${layerInfo.x * scale}px`,
          };

    // Force line-height to 1 for name fields
    const isNameField =
      fieldName.includes("name_jp") || fieldName.includes("name_en");

    const lineHeight = isNameField
      ? 1
      : getLineHeight(layerInfo.lineHeight, layerInfo.fontSize);

    // Apply letter-spacing: 10% (0.1em) for name fields
    const letterSpacing = isNameField ? "0.1em" : "normal";

    // Apply white text shadow for glow effect (text outline)
    const textShadow =
      "0 0 8px rgba(255, 255, 255, 0.8), 0 0 16px rgba(255, 255, 255, 0.6), 0 0 24px rgba(255, 255, 255, 0.4)";

    // Position adjustment for download - ローマ字名を下げる
    const isRomanName = fieldName.includes("name_en");
    const topAdjustment = isForDownload && isRomanName ? 30 : 0; // ダウンロード時はローマ字名を30px下げる
    const topPosition = `${(layerInfo.y + topAdjustment) * scale}px`;

    elements.push(
      <div
        key={fieldName}
        style={{
          position: "absolute",
          ...positionStyle,
          top: topPosition,
          fontSize: `${layerInfo.fontSize * scale}px`,
          fontWeight: layerInfo.fontWeight,
          fontFamily: '"Noto Sans JP", sans-serif',
          color: getFillColor(layerInfo.fills),
          textAlign: textAlign as any,
          lineHeight,
          letterSpacing,
          textShadow,
          whiteSpace: "nowrap",
        }}
      >
        {displayValue}
      </div>,
    );
  });

  return elements;
}

// Download version with fixed 1920x1080 size
function TemplateDownloadCanvas({
  formData,
  templateId,
  templateData,
}: {
  formData: FormData;
  templateId: string;
  templateData?: TemplateDataType;
}) {
  const template = TEMPLATES.find((t) => t.id === templateId);

  if (!templateData) {
    return null;
  }

  return (
    <div
      id={`download-${templateId}`}
      style={
        {
          width: "1920px",
          height: "1080px",
          position: "relative",
          // 明示的に標準的な色を指定してoklch()の継承を防ぐ
          // html2canvas v1.4.1はoklch()をサポートしないため、
          // すべてのCSS変数を標準的なrgba/hex値で上書き
          color: "#000000",
          backgroundColor: "#ffffff",
          // @ts-ignore - CSS変数の型エラーを無視
          "--foreground": "#252525",
          "--card-foreground": "#252525",
          "--popover": "#ffffff",
          "--popover-foreground": "#252525",
          "--primary-foreground": "#ffffff",
          "--secondary": "#f2f2f3",
          "--ring": "#b5b5b5",
          "--chart-1": "#e89c4a",
          "--chart-2": "#7dc6d1",
          "--chart-3": "#5a6798",
          "--chart-4": "#f5d97b",
          "--chart-5": "#f1c469",
        } as React.CSSProperties
      }
    >
      {/* Background image */}
      {templateData.imageUrl && (
        <img
          src={templateData.imageUrl}
          alt={`Background for ${templateId}`}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "1920px",
            height: "1080px",
            objectFit: "cover",
          }}
        />
      )}

      {/* Text fields positioned according to Figma */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        {renderInfoFrame(templateData, formData, 1, true)}
      </div>
    </div>
  );
}

function TemplatePreviewCanvas({
  formData,
  templateId,
  templateData,
}: {
  formData: FormData;
  templateId: string;
  templateData?: TemplateDataType;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const template = TEMPLATES.find((t) => t.id === templateId);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Debug: Log template data
  useEffect(() => {
    console.log(`[TemplatePreviewCanvas] ${templateId}:`, {
      hasTemplateData: !!templateData,
      imageUrl: templateData?.imageUrl,
      imageLoaded,
      imageError,
    });
  }, [templateId, templateData, imageLoaded, imageError]);

  // Measure container size for scaling
  useEffect(() => {
    if (!canvasRef.current) return;

    const updateSize = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  if (!templateData) {
    return (
      <div
        style={{
          width: "100%",
          aspectRatio: "16/9",
          borderRadius: "8px",
          overflow: "hidden",
          backgroundColor: "#1e293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#64748b",
        }}
      >
        テンプレートを読み込み中...
      </div>
    );
  }

  // Calculate scale factor
  const scaleX = containerSize.width / (templateData.width || 1920);
  const scaleY = containerSize.height / (templateData.height || 1080);
  const scale = Math.min(scaleX, scaleY);

  // 新しいFigma構造ベースのレンダリング
  const renderedTextFields = useMemo(() => {
    if (!imageLoaded || containerSize.width === 0) return null;

    try {
      return renderInfoFrame(templateData, formData, scale, false);
    } catch (error) {
      console.error("Error rendering text fields:", error);
      return null;
    }
  }, [formData, scale, imageLoaded, containerSize.width]);

  return (
    <div
      ref={canvasRef}
      id={`preview-${templateId}`}
      style={{
        width: "100%",
        aspectRatio: "16/9",
        borderRadius: "8px",
        overflow: "hidden",
        position: "relative",
        backgroundColor: "#1e293b",
      }}
    >
      {/* Background Figma image */}
      {templateData.imageUrl && (
        <img
          src={templateData.imageUrl}
          alt={template?.displayName}
          onLoad={() => {
            console.log(`✓ Image loaded for ${templateId}`);
            setImageLoaded(true);
            setImageError(null);
          }}
          onError={(e: any) => {
            const error = `Failed to load image: ${e.type} - ${
              e.message || "Unknown error"
            }`;
            console.error(`✗ Image error for ${templateId}:`, error, e);
            setImageError(error);
          }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      )}

      {/* Debug info */}
      {imageError && (
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: 10,
            background: "rgba(255,0,0,0.8)",
            color: "white",
            padding: "5px 10px",
            fontSize: "10px",
            borderRadius: "3px",
            zIndex: 1000,
          }}
        >
          {imageError}
        </div>
      )}
      {!imageLoaded && templateData.imageUrl && !imageError && (
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: 10,
            background: "rgba(255,165,0,0.8)",
            color: "white",
            padding: "5px 10px",
            fontSize: "10px",
            borderRadius: "3px",
            zIndex: 1000,
          }}
        >
          Loading image...
        </div>
      )}

      {/* Text fields positioned according to Figma */}
      {renderedTextFields && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          {renderedTextFields}
        </div>
      )}
    </div>
  );
}
