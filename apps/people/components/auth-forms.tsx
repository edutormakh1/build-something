"use client";

import Link from "next/link";
import { FormEvent, useActionState, useState } from "react";
import { hasRecoveryConfig, recoveryRequestUrl, type PasswordState } from "@bs/auth/recovery";
import { createBrowserSupabase } from "@bs/auth/browser";
import { hasRealSupabase, peopleSiteUrl } from "@bs/auth";

const SIZES = ["solo", "2-10", "11-50", "51-200", "201-1000", "1000+"];

function accountUrl() {
  return `${peopleSiteUrl()}/account`;
}

async function tryLightweightProfile(
  supabase: ReturnType<typeof createBrowserSupabase>,
  userId: string,
  email: string,
) {
  const nick = (email.split("@")[0] || "Member").slice(0, 80);
  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    full_name: nick,
    status: "pending",
  });
  return error;
}

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [magic, setMagic] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "");
    if (!hasRealSupabase()) {
      setMsg("The gallery is open from seed JSON. Auth waits on real Supabase keys.");
      return;
    }
    setBusy(true);
    const supabase = createBrowserSupabase();
    if (magic) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: accountUrl() },
      });
      setBusy(false);
      setMsg(error ? error.message : "Check your email — a door link is on the way.");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: String(fd.get("password")),
    });
    setBusy(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setMsg("You’re in.");
    window.location.href = nextPath || "/account";
  }

  return (
    <form onSubmit={onSubmit} className="hall-form">
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" autoComplete="email" required placeholder="you@studio.com" />
      {!magic ? (
        <>
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
        </>
      ) : null}
      <button type="submit" disabled={busy}>
        {busy ? "Opening…" : magic ? "Email me a link" : "Enter"}
      </button>
      <p className="hall-alt">
        <button type="button" className="textish" onClick={() => setMagic((v) => !v)}>
          {magic ? "Use a password instead" : "Prefer a magic link?"}
        </button>
        {" · "}
        <a href="/forgot-password">Forgot password</a>
      </p>
      <p className="hall-fine">Password reset returns to this site.</p>
      {msg ? <p role="status">{msg}</p> : null}
    </form>
  );
}

export function SignupForm() {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [magic, setMagic] = useState(false);

  async function onAuth(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "");
    const password = String(fd.get("password") || "");
    if (!hasRealSupabase()) {
      setDone(true);
      setMsg("Auth is waiting on real Supabase keys. You can still walk the catalog.");
      return;
    }
    setBusy(true);
    const supabase = createBrowserSupabase();
    if (magic) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: accountUrl() },
      });
      setBusy(false);
      if (error) {
        setMsg(error.message);
        return;
      }
      setDone(true);
      setMsg("Check your email — that link is your seat at the door.");
      return;
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: accountUrl() },
    });
    if (error) {
      setBusy(false);
      setMsg(error.message);
      return;
    }
    if (data.user) {
      await tryLightweightProfile(supabase, data.user.id, email);
    }
    setBusy(false);
    setDone(true);
    if (data.session) {
      setMsg("You’re in. The gallery is yours to walk.");
      window.location.href = "/account";
      return;
    }
    setMsg("Check your email if a confirmation landed. After that you’re in — no paperwork first.");
  }

  if (done) {
    return (
      <div className="hall-done">
        <p role="status">{msg}</p>
        <p>
          <Link href="/">Walk the gallery</Link> · <Link href="/login">Log in</Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onAuth} className="hall-form">
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" autoComplete="email" required placeholder="you@studio.com" />
      {!magic ? (
        <>
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </>
      ) : null}
      <button type="submit" disabled={busy}>
        {busy ? "Making your seat…" : magic ? "Email me a link" : "Come in"}
      </button>
      <p className="hall-alt">
        <button type="button" className="textish" onClick={() => setMagic((v) => !v)}>
          {magic ? "Use a password instead" : "Prefer a magic link?"}
        </button>
        {" · "}
        <Link href="/login">Already a member?</Link>
      </p>
      {msg ? <p role="status">{msg}</p> : null}
    </form>
  );
}

export function ForgotForm() {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!hasRecoveryConfig()) {
      setMsg("Password reset is temporarily unavailable. Please try again later.");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const supabase = createBrowserSupabase();
      const { error } = await supabase.auth.resetPasswordForEmail(String(fd.get("email") || ""), {
        redirectTo: recoveryRequestUrl(window.location.origin),
      });
      setMsg(error
        ? "We could not send a reset link. Please try again later."
        : "If the account exists, a reset email is on the way. Open it in this browser, on this site.");
    } catch {
      setMsg("We could not send a reset link. Please try again later.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={onSubmit} className="hall-form">
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" required autoComplete="email" />
      <button type="submit" disabled={busy}>
        {busy ? "Sending…" : "Send reset link"}
      </button>
      <p className="hall-fine">Open the reset email in the same browser and on the same site where you requested it.</p>
      {msg ? <p role="status">{msg}</p> : null}
    </form>
  );
}

export function ResetPasswordForm({ action, continuePath }: {
  action: (previous: PasswordState, formData: FormData) => Promise<PasswordState>;
  continuePath: "/account" | "/";
}) {
  const [state, submit, pending] = useActionState<PasswordState, FormData>(action, { status: "idle", message: "" });
  if (state.status === "success") {
    return (
      <div>
        <p role="status">{state.message}</p>
        <p><Link href={continuePath}>Continue</Link> · <Link href="/login">Log in</Link></p>
      </div>
    );
  }
  return (
    <form action={submit} className="hall-form">
      <label htmlFor="new-password">New password</label>
      <input id="new-password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      <label htmlFor="confirm-password">Confirm new password</label>
      <input id="confirm-password" name="confirmation" type="password" autoComplete="new-password" minLength={8} required />
      <button type="submit" disabled={pending}>{pending ? "Updating…" : "Update password"}</button>
      {state.message ? <p role="alert">{state.message}</p> : null}
      <p><Link href="/forgot-password" prefetch={false}>Request a new reset link</Link></p>
    </form>
  );
}

export function SignOutButton() {
  const [msg, setMsg] = useState("");
  async function onClick() {
    if (!hasRealSupabase()) return;
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    setMsg("Signed out.");
    window.location.href = "/";
  }
  return (
    <p>
      <button type="button" className="btn ghost" onClick={onClick}>
        Sign out
      </button>
      {msg ? <span role="status"> {msg}</span> : null}
    </p>
  );
}

export function BusinessProfileForm({ purpose }: { purpose: "list" | "review" | "account" }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  async function onProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const ship = String(fd.get("what_they_ship"));
    const why = String(fd.get("why_belong"));
    if (ship.length < 400) {
      setMsg("What you ship must be at least 400 characters — that’s the catalog bar, not the door.");
      return;
    }
    if (why.length < 280) {
      setMsg("Why you belong must be at least 280 characters.");
      return;
    }
    if (!hasRealSupabase()) {
      setMsg("Profile saved in spirit only until keys exist. Expected status: pending.");
      return;
    }
    setBusy(true);
    const supabase = createBrowserSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      setMsg("Sign in first.");
      return;
    }
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
    setBusy(false);
    setMsg(
      error
        ? error.message
        : "Membership card submitted. Status stays pending until an editor approves listing or reviews. You cannot set is_admin.",
    );
  }

  const why =
    purpose === "list"
      ? "To list a product, editors need the long card. It is not required to walk the gallery."
      : purpose === "review"
        ? "To file a review, complete this card. Browsing never required it."
        : "Optional. Fill this only if you want to list a product or write a review.";

  return (
    <form onSubmit={onProfile} className="hall-form long-form">
      <h2>Membership card</h2>
      <p>{why}</p>
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
        {SIZES.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
      <label htmlFor="intended_product">Intended product</label>
      <input id="intended_product" name="intended_product" required />
      <label htmlFor="what_they_ship">What you ship (400+ characters)</label>
      <textarea id="what_they_ship" name="what_they_ship" rows={8} minLength={400} required />
      <label htmlFor="why_belong">Why you belong here (280+ characters)</label>
      <textarea id="why_belong" name="why_belong" rows={6} minLength={280} required />
      <button type="submit" disabled={busy}>
        {busy ? "Sending…" : "Submit for review"}
      </button>
      {msg ? <p role="status">{msg}</p> : null}
    </form>
  );
}

export function ReviewDraftForm() {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!hasRealSupabase()) {
      setMsg("Reviews stay pending until keys and an editor exist.");
      return;
    }
    setBusy(true);
    const supabase = createBrowserSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      setMsg("Sign in first.");
      return;
    }
    const { error } = await supabase.from("reviews").insert({
      product: String(fd.get("product")),
      title: String(fd.get("title")),
      body: String(fd.get("body")),
      kind: "user",
      status: "pending",
      author: user.id,
    });
    setBusy(false);
    setMsg(
      error
        ? error.message
        : "Review filed as pending. An editor publishes named user reviews; we never fake UGC.",
    );
  }
  return (
    <form onSubmit={onSubmit} className="hall-form long-form">
      <h2>File a user review</h2>
      <p>Approved members with can_review may insert pending reviews. Kind is user. Status starts pending.</p>
      <label htmlFor="product">Product slug</label>
      <input id="product" name="product" required placeholder="chatgpt" />
      <label htmlFor="title">Title</label>
      <input id="title" name="title" required />
      <label htmlFor="body">Review</label>
      <textarea id="body" name="body" rows={8} required minLength={80} />
      <button type="submit" disabled={busy}>
        {busy ? "Filing…" : "Submit pending review"}
      </button>
      {msg ? <p role="status">{msg}</p> : null}
    </form>
  );
}
