import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface FormInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  error?: string;
  pattern?: string;
  maxLength?: number;
}

export function FormInput({
  label,
  value,
  onChange,
  required = false,
  placeholder,
  error,
  pattern,
  maxLength = 30,
}: FormInputProps) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        pattern={pattern}
        maxLength={maxLength}
        className={error ? "border-destructive" : ""}
        aria-label={label}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
