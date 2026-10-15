import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import { FormField, inputClassName, type FormFieldProps } from "@/components/ui/FormField";

type FieldMeta = Pick<FormFieldProps, "label" | "hint" | "limits" | "error">;

export function TextInput({
  label,
  hint,
  limits,
  error,
  className = "",
  ...props
}: FieldMeta & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FormField label={label} hint={hint} limits={limits} error={error} required={props.required}>
      <input className={`${inputClassName} ${className}`} {...props} />
    </FormField>
  );
}

export function TextArea({
  label,
  hint,
  limits,
  error,
  className = "",
  ...props
}: FieldMeta & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FormField label={label} hint={hint} limits={limits} error={error} required={props.required}>
      <textarea className={`${inputClassName} ${className}`} {...props} />
    </FormField>
  );
}

export function SelectInput({
  label,
  hint,
  limits,
  error,
  className = "",
  children,
  ...props
}: FieldMeta & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FormField label={label} hint={hint} limits={limits} error={error} required={props.required}>
      <select className={`${inputClassName} ${className}`} {...props}>
        {children}
      </select>
    </FormField>
  );
}
