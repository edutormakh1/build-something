import type { Metadata } from "next";
import { createServerSupabase, hasRealSupabase } from "@bs/auth/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function Page() {
  let rows: { id: string; full_name: string | null; status: string | null; company_name: string | null }[] = [];
  let allowed = false;
  let note = "Admin requires a signed-in profile with is_admin true.";
  if (hasRealSupabase()) {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
      allowed = Boolean(me?.is_admin);
      if (allowed) {
        const { data } = await supabase.from("profiles").select("id, full_name, status, company_name").order("full_name");
        rows = data || [];
        note = "Pending profiles. Approve in Supabase or a future admin mutation. Do not drop tables.";
      } else note = "You are signed in but not an admin.";
    }
  } else {
    note = "Supabase keys missing. This shell is ready; seed catalog remains public.";
  }
  return (
    <article className="prose">
      <h1>Admin</h1>
      <p>{note}</p>
      <h2>Profiles</h2>
      <h3>Queue</h3>
      {allowed && rows.length ? (
        <table>
          <thead><tr><th>Name</th><th>Company</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}><td>{r.full_name}</td><td>{r.company_name}</td><td>{r.status}</td></tr>
            ))}
          </tbody>
        </table>
      ) : <p>No rows to show.</p>}
    </article>
  );
}
