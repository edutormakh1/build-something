"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createBrowserSupabase } from "@bs/auth/browser";
import { agentsSiteUrl, hasRealSupabase } from "@bs/auth";

function doorUrl() {
  return `${agentsSiteUrl()}/login`;
}

export function LoginForm() {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [magic, setMagic] = useState(false);
  const resetTo = doorUrl();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "");
    if (!hasRealSupabase()) {
      setMsg("The hall is open without keys. Public catalog still reads from seed JSON.");
      return;
    }
    setBusy(true);
    const supabase = createBrowserSupabase();
    if (magic) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: resetTo },
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
    setMsg("You’re in. The catalog was already yours to read.");
    window.location.href = "/";
  }

  return (
    <form onSubmit={onSubmit} className="hall-form">
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" autoComplete="email" required placeholder="you@lab.dev" />
      {!magic ? (
        <>
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
        </>
      ) : null}
      <button type="submit" disabled={busy}>
        {busy ? "Opening…" : magic ? "Email me a link" : "Enter the hall"}
      </button>
      <p className="hall-alt">
        <button type="button" className="textish" onClick={() => setMagic((v) => !v)}>
          {magic ? "Use a password instead" : "Prefer a magic link?"}
        </button>
        {" · "}
        <a href="/forgot-password">Forgot password</a>
      </p>
      <p className="hall-fine">Reset emails return to {resetTo}</p>
      {msg ? <p role="status">{msg}</p> : null}
    </form>
  );
}

export function SignupForm() {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [magic, setMagic] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "");
    const password = String(fd.get("password") || "");
    if (!hasRealSupabase()) {
      setDone(true);
      setMsg("Account storage waits on real keys. Browse the catalog anyway — nothing here requires a login.");
      return;
    }
    setBusy(true);
    const supabase = createBrowserSupabase();
    if (magic) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: doorUrl() },
      });
      setBusy(false);
      if (error) {
        setMsg(error.message);
        return;
      }
      setDone(true);
      setMsg("Check your email — that link is your door.");
      return;
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: doorUrl() },
    });
    setBusy(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setDone(true);
    setMsg("Check email if asked, then you are in. The catalog does not wait on approval.");
  }

  if (done) {
    return (
      <div className="hall-done">
        <p role="status">{msg}</p>
        <p>
          <Link href="/">Approach the catalog</Link> · <Link href="/login">Log in</Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="hall-form">
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" autoComplete="email" required placeholder="you@lab.dev" />
      {!magic ? (
        <>
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </>
      ) : null}
      <button type="submit" disabled={busy}>
        {busy ? "Making your door…" : magic ? "Email me a link" : "Create a door"}
      </button>
      <p className="hall-alt">
        <button type="button" className="textish" onClick={() => setMagic((v) => !v)}>
          {magic ? "Use a password instead" : "Prefer a magic link?"}
        </button>
        {" · "}
        <Link href="/login">Already inside?</Link>
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
    if (!hasRealSupabase()) {
      setMsg("Password reset needs real keys. The redirect would stay on this origin.");
      return;
    }
    setBusy(true);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(String(fd.get("email")), {
      redirectTo: doorUrl(),
    });
    setBusy(false);
    setMsg(error ? error.message : "If the account exists, a reset email is on the way. It returns to this hall, not the people twin.");
  }
  return (
    <form onSubmit={onSubmit} className="hall-form">
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" required autoComplete="email" />
      <button type="submit" disabled={busy}>
        {busy ? "Sending…" : "Send reset link"}
      </button>
      {msg ? <p role="status">{msg}</p> : null}
    </form>
  );
}
