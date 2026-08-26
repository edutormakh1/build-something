export type Site = "people" | "agents";

export type ProductStatus = "draft" | "published" | "hidden";
export type ReviewKind = "editorial" | "user" | "agent" | "public_quote";
export type ReviewStatus = "draft" | "pending" | "published" | "hidden";
export type CompanySize = "solo" | "2-10" | "11-50" | "51-200" | "201-1000" | "1000+";
export type AccountStatus = "pending" | "approved" | "rejected";

export type CapabilityLevel = "none" | "basic" | "strong" | "excellent";

export type TwinScore = {
  human: number;
  agent: number;
  updated: string;
};

export type Capabilities = {
  api: CapabilityLevel;
  mcp: CapabilityLevel;
  cli: CapabilityLevel;
  docs: CapabilityLevel;
  auth: string;
  webhooks: CapabilityLevel;
  sdks: string[];
};

export type Author = {
  slug: string;
  name: string;
  role: string;
  bio: string;
  credentials: string;
  sameAs: string[];
  email?: string;
};

export type Category = {
  slug: string;
  name: string;
  short: string;
  description: string;
  audience: "people" | "agents" | "both";
};

export type Product = {
  slug: string;
  name: string;
  vendor: string;
  website: string;
  description: string;
  longDescription: string;
  category: string;
  extraCategories: string[];
  status: ProductStatus;
  founded: number;
  headquarters: string;
  pricing: string;
  twin: TwinScore;
  capabilities: Capabilities;
  alternatives: string[];
  tags: string[];
  logoText: string;
};

export type Review = {
  slug: string;
  product: string;
  kind: ReviewKind;
  status: ReviewStatus;
  author: string;
  title: string;
  body: string;
  scoreHuman?: number;
  scoreAgent?: number;
  publishedAt: string;
  sourceUrl?: string;
  sourceName?: string;
};

export type Article = {
  slug: string;
  title: string;
  description: string;
  author: string;
  publishedAt: string;
  updatedAt: string;
  tags: string[];
  body: string;
};

export type Catalog = {
  generatedAt: string;
  license: string;
  authors: Author[];
  categories: Category[];
  products: Product[];
  reviews: Review[];
  articles: Article[];
  comparePairs: { a: string; b: string; intro: string }[];
  retiredSlugs: string[];
  rubric: Rubric;
};

export type Problem = {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
};

export type RubricDimension = { id: string; label: string; weight: number };

export type Rubric = {
  human: RubricDimension[];
  agent: RubricDimension[];
  notes: string;
};
