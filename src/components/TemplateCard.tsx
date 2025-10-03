import { Template } from "../types";
import { Checkbox } from "./ui/checkbox";
import { Card } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

interface TemplateCardProps {
  template: Template;
  selected: boolean;
  onToggle: (templateId: string) => void;
  imageUrl?: string;
}

export function TemplateCard({
  template,
  selected,
  onToggle,
  imageUrl,
}: TemplateCardProps) {
  return (
    <Card
      data-template-card={template.id}
      className={`p-4 cursor-pointer transition-all hover:shadow-md ${
        selected ? "border-primary border-2 bg-primary/5" : ""
      }`}
      onClick={() => onToggle(template.id)}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggle(template.id)}
          aria-label={`Select ${template.displayName} template`}
        />
        <div className="flex-1">
          <div className="aspect-video bg-muted rounded-md mb-2 flex items-center justify-center overflow-hidden">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={template.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <Skeleton className="w-full h-full" />
            )}
          </div>
          <h4 className="mb-1">{template.displayName}</h4>
          <p className="text-sm text-muted-foreground">
            {template.description}
          </p>
        </div>
      </div>
    </Card>
  );
}
