import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import { FormField, inputClassName, type FormFieldProps } from "@/components/ui/FormField";

type FieldMeta = Pick<FormFieldProps, "label" | "hint" | "error">;

export function TextInput({
  label,
  hint,
  error,
  className = "",
  ...props
}: FieldMeta & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FormField label={label} hint={hint} error={error} required={props.required}>
      <input className={`${inputClassName} ${className}`} {...props} />
    </FormField>
  );
}

export function TextArea({
  label,
  hint,
  error,
  className = "",
  ...props
}: FieldMeta & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FormField label={label} hint={hint} error={error} required={props.required}>
      <textarea className={`${inputClassName} ${className}`} {...props} />
    </FormField>
  );
}

export function SelectInput({
  label,
  hint,
  error,
  className = "",
  children,
  ...props
}: FieldMeta & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FormField label={label} hint={hint} error={error} required={props.required}>
      <select className={`${inputClassName} ${className}`} {...props}>
        {children}
      </select>
    </FormField>
  );
}
