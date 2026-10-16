import type { ReactNode } from "react";
import type { Tone } from "./motion/tone";

export function Footer({
  tone = "people",
  twinUrl,
  children,
}: {
  tone?: Tone;
  twinUrl: string;
  children?: ReactNode;
}) {
  return (
    <footer className="site wrap bs-footer">
      <div className="bs-footer-grid">
        {children ??
          (tone === "people" ? (
            <>
              <p className="bs-colophon">Gallery colophon</p>
              <p>
                Build Something People Want is edited by Edu Tor. Twin site:{" "}
                <a href={twinUrl}>Build Something Agents Want</a>.
              </p>
              <p>
                <a href="/editorial-policy">Editorial policy</a> · <a href="/methodology">Methodology</a> ·{" "}
                <a href="/contact">Contact</a> · <a href="/feed.xml">RSS</a> · <a href="/llms.txt">llms.txt</a> · <a href="/api/v1/products">JSON API</a> · <a href="/openapi.json">openapi.json</a>
              </p>
            </>
          ) : (
            <>
              <p className="bs-colophon">Machine colophon</p>
              <p>
                Twin of <a href={twinUrl}>Build Something People Want</a>. Dataset CC BY
                4.0. No fake MCP.
              </p>
              <p>
                <a href="/for-agents">Build Something Agents Want developer resources</a> · <a href="/llms.txt">llms.txt</a>{" "}
                · <a href="/api/v1/products">JSON API</a> · <a href="/openapi.json">openapi.json</a>
              </p>
            </>
          ))}
      </div>
    </footer>
  );
}
