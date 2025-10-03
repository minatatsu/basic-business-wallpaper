import { FormData } from "../types";
import { FormInput } from "./FormInput";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Textarea } from "./ui/textarea";

interface InputFormProps {
  formData: FormData;
  onUpdate: (field: keyof FormData, value: string | string[]) => void;
}

export function InputForm({ formData, onUpdate }: InputFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = (field: keyof FormData, value: string) => {
    const newErrors = { ...errors };

    switch (field) {
      case "last_name_jp":
      case "first_name_jp":
        if (!value && (field === "last_name_jp" || field === "first_name_jp")) {
          newErrors[field] = "必須項目です";
        } else if (value && !/^[ぁ-んァ-ヶー一-龯々]+$/.test(value)) {
          newErrors[field] = "日本語で入力してください";
        } else {
          delete newErrors[field];
        }
        break;
      case "last_name_en":
      case "first_name_en":
        if (!value && (field === "last_name_en" || field === "first_name_en")) {
          newErrors[field] = "必須項目です";
        } else if (value && !/^[a-zA-Z\s]+$/.test(value)) {
          newErrors[field] = "半角英字で入力してください";
        } else {
          delete newErrors[field];
        }
        break;
      default:
        if (value.length > 30) {
          newErrors[field] = "30文字以内で入力してください";
        } else {
          delete newErrors[field];
        }
    }

    setErrors(newErrors);
  };

  const handleChange = (field: keyof FormData, value: string) => {
    onUpdate(field, value);
    validateField(field, value);
  };

  const handleGroupChange = (index: number, value: string) => {
    const newGroups = [...formData.group];
    newGroups[index] = value;
    onUpdate("group", newGroups);
  };

  const addGroup = () => {
    onUpdate("group", [...formData.group, ""]);
  };

  const removeGroup = (index: number) => {
    if (formData.group.length > 1) {
      const newGroups = formData.group.filter((_, i) => i !== index);
      onUpdate("group", newGroups);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4">基本情報</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="姓（日本語）"
            value={formData.last_name_jp}
            onChange={(v) => handleChange("last_name_jp", v)}
            required
            placeholder="山田"
            error={errors.last_name_jp}
            maxLength={20}
          />
          <FormInput
            label="名（日本語）"
            value={formData.first_name_jp}
            onChange={(v) => handleChange("first_name_jp", v)}
            required
            placeholder="太郎"
            error={errors.first_name_jp}
            maxLength={20}
          />
          <FormInput
            label="姓（ローマ字）"
            value={formData.last_name_en}
            onChange={(v) => handleChange("last_name_en", v)}
            required
            placeholder="Yamada"
            error={errors.last_name_en}
            maxLength={20}
          />
          <FormInput
            label="名（ローマ字）"
            value={formData.first_name_en}
            onChange={(v) => handleChange("first_name_en", v)}
            required
            placeholder="Taro"
            error={errors.first_name_en}
            maxLength={20}
          />
        </div>
      </div>

      <div>
        <h3 className="mb-4">所属情報（任意）</h3>
        <Tabs
          value={formData.affiliation_mode}
          onValueChange={(v: string) =>
            onUpdate("affiliation_mode", v as "basic" | "custom")
          }
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">基本入力</TabsTrigger>
            <TabsTrigger value="custom">カスタム入力</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <FormInput
              label="部門1 (事業部・部門レベル)"
              value={formData.department_1}
              onChange={(v) => handleChange("department_1", v)}
              placeholder="ferret事業部"
              error={errors.department_1}
            />
            <FormInput
              label="部門2 (部・室レベル)"
              value={formData.department_2}
              onChange={(v) => handleChange("department_2", v)}
              placeholder="マーケティング部"
              error={errors.department_2}
            />
            <div className="space-y-2">
              <label className="block text-sm font-medium mb-2">
                部門3（グループレベル）
              </label>
              <div className="space-y-2">
                {formData.group.map((group, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <Input
                      value={group}
                      onChange={(e) => handleGroupChange(index, e.target.value)}
                      placeholder="インサイドセールスグループ"
                      className="flex-1"
                    />
                    {formData.group.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeGroup(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addGroup}
                  className="text-blue-600 hover:text-blue-700 gap-1"
                >
                  <Plus className="h-4 w-4" />
                  追加する
                </Button>
              </div>
            </div>
            <FormInput
              label="役職"
              value={formData.role}
              onChange={(v) => handleChange("role", v)}
              placeholder="マネージャー"
              error={errors.role}
            />
          </TabsContent>

          <TabsContent value="custom" className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                所属・役職（自由入力）
              </label>
              <Textarea
                value={formData.custom_affiliation}
                onChange={(e) => onUpdate("custom_affiliation", e.target.value)}
                placeholder="例:&#10;ferret事業部&#10;マーケティング部&#10;インサイドセールスグループ / プロダクト&#10;&#10;マネージャー"
                rows={8}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                ※ 改行はプレビューにそのまま反映されます
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
