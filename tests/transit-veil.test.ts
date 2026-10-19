import { createRequire } from "node:module";
import type { ReactElement, ReactNode } from "../packages/ui/node_modules/react";
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

beforeEach(() => {
  vi.stubGlobal("React", React);
  scene.mockClear();
});
afterEach(() => vi.unstubAllGlobals());

// Archived component coverage: normal app routes no longer mount this veil.
// Its former stylesheet deadline/layout assertions were retired with that CSS.
describe("archived decorative transition veil", () => {
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
});
