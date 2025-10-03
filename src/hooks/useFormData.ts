import { useState, useEffect } from "react";
import { FormData } from "../types";

const STORAGE_KEY = "mtg-background-form-data";

const initialFormData: FormData = {
  last_name_jp: "",
  first_name_jp: "",
  last_name_en: "",
  first_name_en: "",
  department_1: "",
  department_2: "",
  group: "",
  role: "",
  selected_templates: [],
};

export function useFormData() {
  const [formData, setFormData] = useState<FormData>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return { ...initialFormData, ...JSON.parse(saved) };
        } catch (e) {
          return initialFormData;
        }
      }
    }
    return initialFormData;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
  }, [formData]);

  const updateField = (field: keyof FormData, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData(initialFormData);
  };

  const isValid = () => {
    return !!(
      formData.last_name_jp &&
      formData.first_name_jp &&
      formData.last_name_en &&
      formData.first_name_en &&
      formData.selected_templates.length > 0
    );
  };

  return {
    formData,
    updateField,
    resetForm,
    isValid,
  };
}
