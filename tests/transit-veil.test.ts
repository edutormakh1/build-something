import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { ReactElement, ReactNode } from "../packages/ui/node_modules/react";
import type { Container } from "../apps/people/node_modules/postcss";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TransitVeil from "../packages/ui/src/motion/transit-veil";
import { STILLS } from "../packages/ui/src/motion/tone";

// Stop at Scene rather than initializing a renderer in the Node regression test.
const scene = vi.hoisted(() => vi.fn(() => null));
vi.mock("../packages/ui/src/motion/scene", () => ({ Scene: scene }));
vi.mock("../packages/ui/src/motion/relic", () => ({ Relic: () => null }));

const require = createRequire(new URL("../apps/people/package.json", import.meta.url));
const React: typeof import("../packages/ui/node_modules/react") = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const postcss: typeof import("../apps/people/node_modules/postcss") = require("postcss");
const css = postcss.parse(readFileSync(new URL("../packages/ui/src/theme/base.css", import.meta.url), "utf8"));

function declarations(container: Container) {
  return Object.fromEntries(container.nodes?.flatMap(node =>
    node.type === "decl" ? [[node.prop, node.value]] : [],
  ) ?? []);
}

function transitRule() {
  const rule = css.nodes.find(node => node.type === "rule" && node.selector === ".bs-transit");
  expect(rule, "the overlay has its own top-level CSS rule").toBeDefined();
  return declarations(rule as Container);
}

beforeEach(() => {
  vi.stubGlobal("React", React);
  scene.mockClear();
});
afterEach(() => vi.unstubAllGlobals());

describe("decorative transition veil", () => {
  it.each(["people", "agents"] as const)("renders only the branded static image for %s", tone => {
    const element = TransitVeil({ tone });
    renderToStaticMarkup(element);
    expect(scene, "navigation must not enter Scene's live-renderer path").not.toHaveBeenCalled();

    const elements: ReactElement<Record<string, unknown>>[] = [];
    function visit(node: ReactNode) {
      if (!React.isValidElement<Record<string, unknown>>(node)) return;
      expect(typeof node.type, "the veil tree contains only DOM elements").toBe("string");
      elements.push(node);
      React.Children.forEach(node.props.children as ReactNode, visit);
    }
    visit(element);
    expect(element.props).toMatchObject({ className: "bs-transit", "aria-hidden": "true" });
    expect(elements.find(node => node.props.className === "bs-scene")?.props["data-tone"]).toBe(tone);
    const images = elements.filter(node => node.type === "img");
    expect(images).toHaveLength(1);
    expect(images[0].props).toMatchObject({ className: "bs-still", src: STILLS[tone].environmentMark, alt: "" });
    expect(elements.every(node => typeof node.props.children !== "string")).toBe(true);
  });

  it("has a finite CSS deadline within 720 ms even while the DOM remains mounted", () => {
    const rule = transitRule();
    const duration = rule["animation-duration"]?.match(/^([\d.]+)(ms|s)$/);
    expect(duration, "the overlay needs a finite animation duration").not.toBeNull();
    expect(duration).toBeDefined();
    const milliseconds = Number(duration![1]) * (duration![2] === "s" ? 1000 : 1);
    expect(milliseconds).toBeGreaterThan(0);
    expect(milliseconds).toBeLessThanOrEqual(720);
    expect(rule["animation-delay"] ?? "0s").toMatch(/^0(m?s)$/);
    expect(rule["animation-iteration-count"] ?? "1").toBe("1");
    expect(rule["animation-direction"] ?? "normal").toBe("normal");
    expect(["forwards", "both"]).toContain(rule["animation-fill-mode"]);

    const frames = css.nodes.find(node => node.type === "atrule" && node.name === "keyframes" && node.params === rule["animation-name"]);
    expect(frames, "the deadline must refer to real scoped keyframes").toBeDefined();
    const terminal = (frames as Container).nodes?.find(node =>
      node.type === "rule" && node.selectors.some(selector => selector === "to" || selector === "100%"),
    );
    expect(terminal, "the final state must persist without JavaScript cleanup").toBeDefined();
    expect(declarations(terminal as Container)).toMatchObject({ opacity: "0", visibility: "hidden" });
  });

  it("stays hidden when reduced motion disables the decorative animation", () => {
    expect(transitRule()).toMatchObject({ opacity: "0", visibility: "hidden" });
    const media = css.nodes.find(node => node.type === "atrule" && node.name === "media" && node.params === "(prefers-reduced-motion: reduce)");
    const rule = (media as Container).nodes?.find(node => node.type === "rule" && node.selector === ".bs-transit");
    expect(rule).toBeDefined();
    expect(declarations(rule as Container).animation).toBe("none");
  });

  it("keeps the overlay out of layout and pointer input with the existing cover crop", () => {
    expect(transitRule()).toMatchObject({ position: "fixed", inset: "0", "pointer-events": "none" });
    const sceneRule = css.nodes.find(node => node.type === "rule" && node.selector === ".bs-transit .bs-scene");
    expect(declarations(sceneRule as Container)).toMatchObject({ width: "100%", height: "100%" });
    const stillRule = css.nodes.find(node => node.type === "rule" && node.selectors.includes(".bs-still"));
    expect(declarations(stillRule as Container)["object-fit"]).toBe("cover");
  });
});
