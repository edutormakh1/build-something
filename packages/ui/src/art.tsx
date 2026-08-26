import type { Tone } from "./motion/tone";
import { STILLS } from "./motion/tone";

export function HeroArt({ tone, alt }: { tone: Tone; alt?: string }) {
  return (
    <figure className="bs-hero-art">
      <img
        src={STILLS[tone].hero}
        alt={alt ?? (tone === "people" ? "Bronze relic on a limestone plinth" : "Obsidian relic with gold filament")}
      />
    </figure>
  );
}

export function HallArt({ tone, alt }: { tone: Tone; alt?: string }) {
  return (
    <figure className="bs-hall-art">
      <img src={STILLS[tone].hall} alt={alt ?? "Gallery hall"} />
    </figure>
  );
}

export function BrandMarkArt({ alt = "" }: { alt?: string }) {
  return <img className="bs-relic" src="/art/brand-mark-3d.png" alt={alt} width={56} height={56} />;
}
