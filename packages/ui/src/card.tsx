import type { ReactNode } from "react";

export function Card({
  kicker,
  title,
  href,
  children,
  as: Tag = "article",
}: {
  kicker?: string;
  title?: ReactNode;
  href?: string;
  children?: ReactNode;
  as?: "article" | "div" | "li";
}) {
  return (
    <Tag className="bs-card card">
      {kicker ? <p className="kicker">{kicker}</p> : null}
      {title ? (
        <h3 className="bs-card-title">
          {href ? <a href={href}>{title}</a> : title}
        </h3>
      ) : null}
      {children}
    </Tag>
  );
}
