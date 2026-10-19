export function supabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || "https://slkrntjfavigfhbkeyoa.supabase.co";
}

export function supabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "public-anon-placeholder";
}

export function hasRealSupabase(): boolean {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return key.length > 20 && !key.includes("replace-me") && !key.includes("placeholder");
}

export function peopleSiteUrl(): string {
  return process.env.NEXT_PUBLIC_PEOPLE_SITE_URL || "https://www.buildsomethingpeoplewant.com";
}

export function agentsSiteUrl(): string {
  return process.env.NEXT_PUBLIC_AGENTS_SITE_URL || "https://www.buildsomethingagentswant.com";
}
