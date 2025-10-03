// 新しいレンダリング実装
// Figma MCPから取得した構造に基づいて完全に書き直し

import { FormData } from "@/types";

interface TemplateDataType {
  imageUrl: string;
  textLayers: any;
  frames: any;
  width: number;
  height: number;
}

// Infoフレームのレンダリング（絶対配置）
function renderInfoFrame(
  templateData: TemplateDataType,
  formData: FormData,
  scale: number = 1,
  isForDownload: boolean = false,
) {
  const {
    last_name_jp,
    first_name_jp,
    last_name_en,
    first_name_en,
    department_1,
    department_2,
    group,
    role,
  } = formData;

  // 空チェック
  const hasName =
    last_name_jp || first_name_jp || last_name_en || first_name_en;
  const groupText = Array.isArray(group)
    ? group.filter((g) => g.trim() !== "").join(" / ")
    : group;
  const hasTeam = department_1 || department_2 || groupText || role;
  if (!hasName && !hasTeam) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: `${(isForDownload ? 80 : 100) * scale}px`,
        right: `${98 * scale}px`, // Figmaの位置
        display: "flex",
        flexDirection: "column",
        gap: `${36 * scale}px`,
        textShadow:
          "0 0 8px rgba(255, 255, 255, 0.8), 0 0 16px rgba(255, 255, 255, 0.6), 0 0 24px rgba(255, 255, 255, 0.4)",
      }}
    >
      {/* Profile フレーム */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: `${30 * scale}px`,
          alignItems: "flex-end",
        }}
      >
        {/* Name フレーム */}
        {hasName && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: `${24 * scale}px`,
            }}
          >
            {/* Frame 1 */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: `${(isForDownload ? 40 : 24) * scale}px`, // ダウンロード時は32px
                alignItems: "flex-end",
                marginTop: `${(isForDownload ? -32 : 0) * scale}px`,
              }}
            >
              {/* Frame 54262 - 日本語名 */}
              {(last_name_jp || first_name_jp) && (
                <div
                  style={{
                    display: "flex",
                    gap: `${64 * scale}px`,
                    alignItems: "center",
                    justifyContent: "flex-end",
                    fontFamily: '"Noto Sans JP", sans-serif',
                    fontSize: `${135 * scale}px`,
                    fontWeight: 900,
                    lineHeight: 1,
                    letterSpacing: "0.1em",
                    color: "#171717",
                    whiteSpace: "nowrap",
                  }}
                >
                  {last_name_jp && <div>{last_name_jp}</div>}
                  {first_name_jp && <div>{first_name_jp}</div>}
                </div>
              )}

              {/* Frame 54263 - ローマ字名 */}
              {(last_name_en || first_name_en) && (
                <div
                  style={{
                    display: "flex",
                    gap: `${48 * scale}px`,
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: '"Noto Sans JP", sans-serif',
                    fontSize: `${54 * scale}px`,
                    fontWeight: 700,
                    lineHeight: 1,
                    letterSpacing: "0.1em",
                    color: "#171717",
                    whiteSpace: "nowrap",
                    textAlign: "right",
                    textTransform: "uppercase",
                  }}
                >
                  {last_name_en && <div>{last_name_en.toUpperCase()}</div>}
                  {first_name_en && <div>{first_name_en.toUpperCase()}</div>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Team フレーム */}
        {hasTeam && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: `${8 * scale}px`,
              alignItems: "flex-end",
              fontFamily: '"Noto Sans JP", sans-serif',
              fontSize: `${38 * scale}px`,
              fontWeight: 700,
              lineHeight: "normal",
              color: "#171717",
              whiteSpace: "nowrap",
            }}
          >
            {/* Frame (小文字のフレーム) */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: `${8 * scale}px`,
                alignItems: "flex-end",
                justifyContent: "center",
              }}
            >
              {/* Frame 54269 - 部門 */}
              {(department_1 || department_2) && (
                <div
                  style={{
                    display: "flex",
                    gap: `${8 * scale}px`,
                    alignItems: "center",
                  }}
                >
                  {department_1 && <div>{department_1}</div>}
                  {department_2 && <div>{department_2}</div>}
                </div>
              )}

              {/* グループ */}
              {groupText && <div>{groupText}</div>}
            </div>

            {/* 役職 */}
            {role && <div style={{ textAlign: "right" }}>{role}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

export { renderInfoFrame };
