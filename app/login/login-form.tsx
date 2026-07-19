"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setPending(true);
    setError("");

    const supabase = createClient();

    const { error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError) {
      setError("Неверный email или пароль.");
      setPending(false);
      return;
    }

    const nextPath = searchParams.get("next");
    const safePath =
      nextPath?.startsWith("/") &&
      !nextPath.startsWith("//")
        ? nextPath
        : "/orders";

    router.replace(safePath);
    router.refresh();
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <div className="login-field">
        <label htmlFor="email">Email</label>

        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          placeholder="name@axeeng.kz"
          required
        />
      </div>

      <div className="login-field">
        <label htmlFor="password">Пароль</label>

        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          placeholder="Введите пароль"
          required
        />
      </div>

      {error ? (
        <div className="login-error" role="alert">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        className="login-button"
        disabled={pending}
      >
        {pending ? "Вход..." : "Войти в AXE OS"}
      </button>
    </form>
  );
}
