"use client";

import { useCallback, useState } from "react";

import type { CustomizationField } from "../../../../lib/api";
import type {
  CustomizationEntry,
  CustomizationFieldValue,
  CustomizationValues,
} from "../../../../lib/customization";
import { prepareCustomizationEntries } from "../../../../lib/customization";

export type CustomizationValidationResult =
  | { ok: true; entries: CustomizationEntry[] }
  | { ok: false; errors: Record<string, string> };

export default function useProductCustomization(fields: CustomizationField[]) {
  const [values, setValues] = useState<CustomizationValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setValue = useCallback((fieldId: string, value: CustomizationFieldValue) => {
    setValues((previous) => ({ ...previous, [fieldId]: value }));
    setErrors((previous) => {
      if (!previous[fieldId]) {
        return previous;
      }

      const next = { ...previous };
      delete next[fieldId];
      return next;
    });
  }, []);

  const validate = useCallback((): CustomizationValidationResult => {
    const result = prepareCustomizationEntries(fields, values);

    if (!result.valid) {
      setErrors(result.errors);
      return { ok: false, errors: result.errors };
    }

    setErrors({});
    return { ok: true, entries: result.entries };
  }, [fields, values]);

  return { values, errors, setValue, validate };
}
