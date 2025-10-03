import { TEMPLATES } from "../types";
import { TemplateCard } from "./TemplateCard";
import { useFigmaImages } from "../hooks/useFigmaImages";

interface TemplateSelectorProps {
  selectedTemplates: string[];
  onToggle: (templateId: string) => void;
}

export function TemplateSelector({
  selectedTemplates,
  onToggle,
}: TemplateSelectorProps) {
  const { templateData } = useFigmaImages();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2">テンプレート選択</h3>
        <p className="text-sm text-muted-foreground">
          1つ以上のテンプレートを選択してください
          {selectedTemplates.length > 0 &&
            ` (${selectedTemplates.length}個選択中)`}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TEMPLATES.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            selected={selectedTemplates.includes(template.id)}
            onToggle={onToggle}
            imageUrl={templateData[template.id]?.imageUrl}
          />
        ))}
      </div>
    </div>
  );
}
