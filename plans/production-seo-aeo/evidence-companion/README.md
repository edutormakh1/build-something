This companion separates dated documentation facts from unknowns for ten products and five existing comparisons. Products were not tested. Retained Twin Scores are legacy editorial estimates; documentation checks do not validate them. Responsible human editor: unassigned.

**Documentation-backed access decisions for ten software products — evidence companion, checked 2026-10-17.** Local, unpublished G01 draft; independent review pending. This delivery does not certify G01, E02 or the full goal. No substantive product facts were updated during preparation.

[claims.json](claims.json) is a dated register of 29 product claims: 19 documented and 10 explicit unknowns, across ten products and two existing decision groups. Each original claim object is preserved without changing its ID, statement, source IDs, scope, version, checked date, evidence status or limitations. Added fields identify its product/group, resolve its primary-source URLs and repeat the original automated researcher, documentation-review method, null human editor and `product_tested: false`. Unknowns retain their empty source arrays: they mean research limits, not absent features.

The register includes five existing, oriented People comparison links, both sites' product links, ten Agents skill links and Agents methodology, scorecard and legacy dataset links. Each link states **source-backed at pinned commit; no new HTTP verification** and names its route source. Hosts come from the committed public host constants, without reading runtime overrides. Published product membership, curated orientation and route definitions support availability; this draft adds no GET evidence.

Method and reproduction: use Node with its standard library and Git available at `/usr/bin/git`, in a checkout containing commit `989addd145ab7f315d36c8bb30b8c487e57c9a67`. From the repository root:

```sh
node plans/production-seo-aeo/evidence-companion/generate.mjs --check
node plans/production-seo-aeo/evidence-companion/generate.mjs
node plans/production-seo-aeo/evidence-companion/generate.mjs --check
```

`--check` generates in memory, compares exact bytes with `claims.json` and exits 0 on equality. Without arguments, the generator writes only this directory's `claims.json`. It reads fourteen fixed `git show <full SHA>:<path>` inputs, checks every full SHA-256 listed in `input_sha256`, and never imports application code or uses dependencies, a shell, network, credentials or inherited environment values. JSON uses source order, two-space indentation, UTF-8 and a final newline; there is no current timestamp, scoring calculation or re-rating. Working-tree edits to source inputs are ignored.

The actual factual inputs are `packages/db/seed/editorial-cohort-e02.json` and the catalog at that commit. The other pinned files support existing route availability, public host names, published membership, orientation and legacy export scope. `source_provenance.source_sha` preserves E02's earlier baseline `2e294a91503310a77ec54b6e4ffd5b80ba904351`; the companion's `source_sha` identifies the immutable release it projects. E02's inherited review metadata is historical provenance, not approval of this companion. The source checked date remains **2026-10-17**, not the date of generation.

The full twenty-source bibliography is retained with its original rights and limits; fifteen sources are referenced by product claims. Group-level survey claims and editorial policy claims are deliberately outside the 29-row register. No survey dataset, research quotations, vendor full text, screenshots or code are copied. Product narratives, catalog scores, capability grades, rubric weights, bylines and other catalog metadata are omitted; existing links provide their context. Comparison decision questions, checks and claim references remain intact.

This companion is separate from the existing **CC BY 4.0 legacy Twin Scores export**. Its JSON route exposes catalog date `2026-08-25`, rubric and legacy estimates; CSV is the flat score/capability projection. Neither contains E02's claim register or original scoring observations. This companion also has no original scoring observations: byte reproduction establishes this documentary projection only and **cannot reproduce a product benchmark**.

Rights: reuse is limited here to our already-written claim synthesis and primary links. Vendor documentation redistribution rights were not established; the retained bibliography records distinct Stack Overflow ODbL/DbCL and contribution terms. Neither the existing export licence nor public access grants a blanket CC licence to third-party material or this companion. Redistribution-rights assessment and a licence decision for the companion's own synthesis remain **pending where unestablished**, before distribution. This is not legal advice.

Historical provenance was read locally, without new research. Paths below are relative to `/home/edutor/.lead/github.com/edutormakh1/build-something/runs/chore/cloudflare-hosting/`; hashes identify whole local file bytes, not vendor response bodies. These references are not runtime generator inputs:

- `E02-research/sources.json` — `e4488ffaed648e032ce5c7a842442a59d242ab41228bcd9e6046de2ae09bc4b9`: dated 2026-10-17, 21 attempted / 20 retrieved / one failed; failed S08 supports no claim.
- `E02-research/activation-recheck.json` — `850755100a63c985b8e994357ad805f95c2a18f638132a562ff6064686473218`: recorded `2026-10-17T04:53:10Z`, d487 baseline; ten scoped claims, six URLs. Later copy clarifications changed two limitations; the pinned committed sidecar governs this projection. No new recheck is claimed.
- `E02-research/README.md` — `35db6415ad88246a07912316785c9fabbc965547abc803f1119d1c1542beb50d`.
- `proposals/E02-cohort.md` — `aff508967bf1fc5c0c0224aae05adce3b8b8e405e31c1de8b97cb0da44fc6930`.
- `E02-proposal-review2.md` — `b9bd74b392c45d4d5532485cc1c71dbd76ae85a6b70b2724ef9497f6d2de8a05`: proposal scope only.
- `E02-implementation-review2.md` — `78dfb1ea8f9afdd05870c0dabf237fa8dfaf75eb7b3c31371e8cbd74842ed529`: cc6 implementation and copy; not public delivery.
- `E02-activation-review1.md` — `dcc88cdc8a708c85c9530b3117843b451b345a7407a50c6cd464d4d15e44c96b`: ec31 activation/local evidence; not a new product check.
- `Launch-next-stage-20261019/next-stage.md` — `c562eae22e09eb3cc5d87b76d64f394d00edab1b174868eb8ae45dc8ae1d011f`.
- `Launch-next-stage-20261019/evidence-matrix.safe.json` — `83b0e6c8a386ad99fe28ec0f34af894a7844350a6ac4a3e3278f3d7e6c199aa9`: G01 scope and carried release evidence. Immutable SSR/hosting evidence remains attributed to its historical reports; no per-endpoint public verification is inferred here.

Validation is limited to independent pinned-source counts, unique IDs, exact claim fields/dates/unknowns, deterministic regeneration and `git diff --check`. New external calls: **0**. Builds, app starts, services and test suites: **0**. No new indexable pages, schema, API, plugin or tracking. [distribution-draft.md](distribution-draft.md) contains only unsent proposals; no publication, outreach, paid links, demand, ranking, traffic, firsthand experience or product-test results are asserted.
