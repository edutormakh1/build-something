"use client";

import { FormEvent, useState } from "react";
import { createBrowserSupabase } from "@bs/auth/browser";
import { hasRealSupabase } from "@bs/auth";

const SIZES = ["solo", "2-10", "11-50", "51-200", "201-1000", "1000+"];

export function LoginForm({ nextPath, resetUrl }: { nextPath?: string; resetUrl: string }) {
  const [msg, setMsg] = useState("");
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!hasRealSupabase()) {
      setMsg("Supabase keys are not configured. Public catalog still works from seed JSON.");
      return;
    }
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });
    setMsg(error ? error.message : "Signed in. Continue to your account.");
    if (!error && nextPath) window.location.href = nextPath;
  }
  return (
    <form onSubmit={onSubmit}>
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" autoComplete="email" required />
      <label htmlFor="password">Password</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required />
      <button type="submit">Log in</button>
      <p><a href="/forgot-password">Forgot password</a> · reset emails return to {resetUrl}</p>
      {msg ? <p role="status">{msg}</p> : null}
    </form>
  );
}

export function SignupForm() {
  const [step, setStep] = useState<1 | 2>(1);
  const [msg, setMsg] = useState("");
  async function onAuth(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!hasRealSupabase()) {
      setMsg("Auth is waiting on real Supabase keys. You can still browse the catalog.");
      setStep(2);
      return;
    }
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signUp({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
      options: { emailRedirectTo: "https://buildsomethingpeoplewant.com/account" },
    });
    if (error) { setMsg(error.message); return; }
    setStep(2);
    setMsg("Check email if confirmation is required, then complete your business profile. Accounts stay pending until an editor approves.");
  }
  async function onProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const ship = String(fd.get("what_they_ship"));
    const why = String(fd.get("why_belong"));
    if (ship.length < 400) { setMsg("What you ship must be at least 400 characters."); return; }
    if (why.length < 280) { setMsg("Why you belong must be at least 280 characters."); return; }
    if (!hasRealSupabase()) { setMsg("Profile saved locally in spirit only until keys exist. Expected status: pending."); return; }
    const supabase = createBrowserSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMsg("Sign in first."); return; }
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: String(fd.get("full_name")),
      company_name: String(fd.get("company_name")),
      company_website: String(fd.get("company_website")),
      role_title: String(fd.get("role_title")),
      company_size: String(fd.get("company_size")),
      what_they_ship: ship,
      why_belong: why,
      intended_product: String(fd.get("intended_product")),
      status: "pending",
    });
    setMsg(error ? error.message : "Profile submitted. Status is pending until an admin approves. You cannot set is_admin.");
  }
  return (
    <div>
      {step === 1 ? (
        <form onSubmit={onAuth}>
          <h2>Step 1 · Email and password</h2>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
          <button type="submit">Create login</button>
        </form>
      ) : (
        <form onSubmit={onProfile}>
          <h2>Step 2 · Business profile</h2>
          <p>Pending until an editor approves. Matching database constraints: what you ship ≥ 400 characters, why you belong ≥ 280.</p>
          <label htmlFor="full_name">Full name</label>
          <input id="full_name" name="full_name" required />
          <label htmlFor="company_name">Company name</label>
          <input id="company_name" name="company_name" required />
          <label htmlFor="company_website">Company website</label>
          <input id="company_website" name="company_website" type="url" required />
          <label htmlFor="role_title">Role title</label>
          <input id="role_title" name="role_title" required />
          <label htmlFor="company_size">Company size</label>
          <select id="company_size" name="company_size" required>
            {SIZES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <label htmlFor="intended_product">Intended product</label>
          <input id="intended_product" name="intended_product" required />
          <label htmlFor="what_they_ship">What you ship (400+ characters)</label>
          <textarea id="what_they_ship" name="what_they_ship" rows={8} minLength={400} required />
          <label htmlFor="why_belong">Why you belong here (280+ characters)</label>
          <textarea id="why_belong" name="why_belong" rows={6} minLength={280} required />
          <button type="submit">Submit for review</button>
        </form>
      )}
      {msg ? <p role="status">{msg}</p> : null}
    </div>
  );
}

export function ForgotForm() {
  const [msg, setMsg] = useState("");
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!hasRealSupabase()) { setMsg("Password reset needs real Supabase keys. Redirect URL would be this site."); return; }
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(String(fd.get("email")), {
      redirectTo: "https://buildsomethingpeoplewant.com/account",
    });
    setMsg(error ? error.message : "If the account exists, a reset email is on the way. It returns to this site, not the agent twin.");
  }
  return (
    <form onSubmit={onSubmit}>
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" required />
      <button type="submit">Send reset link</button>
      {msg ? <p role="status">{msg}</p> : null}
    </form>
  );
}
