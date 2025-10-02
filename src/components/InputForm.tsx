import { FormData } from '../types';
import { FormInput } from './FormInput';
import { useState } from 'react';

interface InputFormProps {
  formData: FormData;
  onUpdate: (field: keyof FormData, value: string) => void;
}

export function InputForm({ formData, onUpdate }: InputFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = (field: keyof FormData, value: string) => {
    const newErrors = { ...errors };

    switch (field) {
      case 'last_name_jp':
      case 'first_name_jp':
        if (!value && (field === 'last_name_jp' || field === 'first_name_jp')) {
          newErrors[field] = '必須項目です';
        } else if (value && !/^[ぁ-んァ-ヶー一-龯々]+$/.test(value)) {
          newErrors[field] = '日本語で入力してください';
        } else {
          delete newErrors[field];
        }
        break;
      case 'last_name_en':
      case 'first_name_en':
        if (!value && (field === 'last_name_en' || field === 'first_name_en')) {
          newErrors[field] = '必須項目です';
        } else if (value && !/^[a-zA-Z\s]+$/.test(value)) {
          newErrors[field] = '半角英字で入力してください';
        } else {
          delete newErrors[field];
        }
        break;
      default:
        if (value.length > 30) {
          newErrors[field] = '30文字以内で入力してください';
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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4">基本情報</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="姓（日本語）"
            value={formData.last_name_jp}
            onChange={(v) => handleChange('last_name_jp', v)}
            required
            placeholder="山田"
            error={errors.last_name_jp}
            maxLength={20}
          />
          <FormInput
            label="名（日本語）"
            value={formData.first_name_jp}
            onChange={(v) => handleChange('first_name_jp', v)}
            required
            placeholder="太郎"
            error={errors.first_name_jp}
            maxLength={20}
          />
          <FormInput
            label="姓（ローマ字）"
            value={formData.last_name_en}
            onChange={(v) => handleChange('last_name_en', v)}
            required
            placeholder="Yamada"
            error={errors.last_name_en}
            maxLength={20}
          />
          <FormInput
            label="名（ローマ字）"
            value={formData.first_name_en}
            onChange={(v) => handleChange('first_name_en', v)}
            required
            placeholder="Taro"
            error={errors.first_name_en}
            maxLength={20}
          />
        </div>
      </div>

      <div>
        <h3 className="mb-4">所属情報（任意）</h3>
        <div className="space-y-4">
          <FormInput
            label="部門1"
            value={formData.department_1}
            onChange={(v) => handleChange('department_1', v)}
            placeholder="マーケティング部"
            error={errors.department_1}
          />
          <FormInput
            label="部門2"
            value={formData.department_2}
            onChange={(v) => handleChange('department_2', v)}
            placeholder="企画課"
            error={errors.department_2}
          />
          <FormInput
            label="グループ"
            value={formData.group}
            onChange={(v) => handleChange('group', v)}
            placeholder="第1グループ"
            error={errors.group}
          />
          <FormInput
            label="役職"
            value={formData.role}
            onChange={(v) => handleChange('role', v)}
            placeholder="マネージャー"
            error={errors.role}
          />
        </div>
      </div>
    </div>
  );
}
