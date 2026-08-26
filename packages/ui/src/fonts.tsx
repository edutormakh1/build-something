import { Archivo, Fraunces } from "next/font/google";

export const display = Fraunces({
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
  variable: "--font-display",
});

export const sans = Archivo({
  subsets: ["latin"],
  display: "swap",
  axes: ["wdth"],
  variable: "--font-sans",
});

/** Server-safe injector so layouts do not have to change. */
export function BrandFonts() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `:root{--font-display:${display.style.fontFamily}, "Iowan Old Style", Palatino, serif;--font-sans:${sans.style.fontFamily}, "Segoe UI", sans-serif;}`,
      }}
    />
  );
}
