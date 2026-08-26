import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function Field({
  label,
  hint,
  error,
  id,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <div className="bs-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint ? <p className="bs-field-hint">{hint}</p> : null}
      {error ? <p className="bs-field-error" role="alert">{error}</p> : null}
    </div>
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`bs-input ${className}`.trim()} {...props} />;
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`bs-input ${className}`.trim()} rows={props.rows ?? 5} {...props} />;
}
