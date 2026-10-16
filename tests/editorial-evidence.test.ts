import { describe, expect, it } from "vitest";
import evidence from "../packages/db/seed/evidence.json";
import { catalog, getAuthor, getProduct } from "../packages/db/src/catalog";
import { orgJsonLd, personJsonLd } from "../packages/seo/src/jsonld";
import { llmsFullTxt, llmsTxt } from "../packages/seo/src/llms";
import { abs } from "../packages/seo/src/sites";

describe("documentary evidence boundaries", () => {
  it("ties the register to existing catalog identities without claiming a product test or a responsible human", () => {
    const used = new Set<string>();
    for (const [slug, record] of Object.entries(evidence.products)) {
      expect(record.slug).toBe(slug);
      expect(record.legacy_twin).toEqual(getProduct(slug)!.twin);
      expect(record.hands_on_tests).toEqual([]);
      expect(record.responsible_human_editor).toBeNull();
      for (const id of record.documentation_evidence_ids) {
        used.add(id);
        const source = evidence.documentation_sources.find((source) => source.id === id)!;
        expect(source.product_slugs).toContain(slug);
        expect(source.method).toBe("documentation review");
        expect(source.result).toContain("product not tested");
        expect(source.human_editor_responsible).toBeNull();
      }
    }
    expect([...used].sort()).toEqual(evidence.documentation_sources.map((source) => source.id).sort());
    expect(evidence.responsible_human_editor).toBeNull();
    for (const [slug, record] of Object.entries(evidence.authors)) {
      expect(record.name).toBe(getAuthor(slug)!.name);
      expect(record.identity_status).toBe("unverified");
      expect(record.credentials_status).toBe("unverified");
    }
  });

  it("emits recorded author attributions and canonical sameAs values without the unsupported founder relationship", () => {
    for (const site of ["people", "agents"] as const) {
      expect(orgJsonLd(site)).not.toHaveProperty("founder");
      expect(orgJsonLd(site).url).toBe(abs(site, "").replace(/\/$/, ""));
    }
    for (const author of catalog.authors) {
      const person = personJsonLd(author);
      expect(person.description).toBe(author.bio);
      expect(person.jobTitle).toBe(author.role);
      expect(person.jobTitle).toMatch(/attribution/);
      expect(person.sameAs).toContain(abs("people", `/authors/${author.slug}`));
      expect(person).not.toHaveProperty("hasCredential");
    }
  });

  it.each(["people", "agents"] as const)("keeps %s llms/full URL maps useful while limiting score, identity and Google claims", (site) => {
    for (const text of [llmsTxt(site), llmsFullTxt(site)]) {
      expect(text).toMatch(/legacy editorial estimates/i);
      expect(text).toMatch(/no firsthand product-test log/i);
      expect(text).toMatch(/agent documentation review dated 2026-10-16/);
      expect(text).toContain("responsible human editor unassigned");
      expect(text).not.toContain("assigned by named staff");
      expect(text).toContain("Google Search ignores llms.txt");
      expect(text).toContain("do not emit AggregateRating");
      expect(text).toContain(abs(site, "/api/v1/products"));
      expect(text).toContain(abs("agents", "/dataset/twin-scores.json"));
      expect(text).toContain(abs("people", "/authors/edu-tor"));
    }
  });
});
