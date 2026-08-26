import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Button({
  variant = "solid",
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "ghost" | "rule";
  children: ReactNode;
}) {
  const v = variant === "ghost" ? "bs-btn bs-btn-ghost" : variant === "rule" ? "bs-btn bs-btn-rule" : "bs-btn";
  return (
    <button className={`${v} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
