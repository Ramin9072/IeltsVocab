"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { loginAction, registerAction, type FormState } from "@/app/actions";
import { useI18n } from "./i18n";
import { Alert, Button, Field, Input } from "./ui";
import type { MsgKey } from "@/lib/i18n";

export function AuthForm({ mode, next }: { mode: "login" | "register"; next?: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<FormState, FormData>(mode === "login" ? loginAction : registerAction, {});
  const tz = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (tz.current) tz.current.value = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  }, []);
  const fieldError = (name: string) => {
    const code = state.fields?.[name];
    return code ? t(`auth.field.${code}` as MsgKey) : undefined;
  };
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error && <Alert tone="error">{t(`auth.err.${state.error}` as MsgKey)}</Alert>}
      {mode === "register" && (
        <Field id="name" label={t("auth.name")} error={fieldError("name")}>
          <Input id="name" name="name" autoComplete="name" required aria-invalid={Boolean(fieldError("name"))} aria-describedby={fieldError("name") ? "name-err" : undefined} />
        </Field>
      )}
      <Field id="email" label={t("auth.email")} error={fieldError("email")}>
        <Input id="email" name="email" type="email" dir="ltr" autoComplete="email" required aria-invalid={Boolean(fieldError("email"))} aria-describedby={fieldError("email") ? "email-err" : undefined} />
      </Field>
      <Field id="password" label={t("auth.password")} hint={mode === "register" ? t("auth.passwordHint") : undefined} error={fieldError("password")}>
        <Input id="password" name="password" type="password" dir="ltr" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "register" ? 8 : undefined} aria-invalid={Boolean(fieldError("password"))} aria-describedby={fieldError("password") ? "password-err" : mode === "register" ? "password-hint" : undefined} />
      </Field>
      {mode === "register" && <input ref={tz} type="hidden" name="timezone" defaultValue="UTC" />}
      {mode === "login" && next && <input type="hidden" name="next" value={next} />}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? t("common.loading") : mode === "login" ? t("auth.login") : t("auth.register")}
      </Button>
      <p className="text-center text-sm text-muted">
        {mode === "login" ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
        <Link href={mode === "login" ? "/register" : "/login"} className="font-medium">
          {mode === "login" ? t("auth.register") : t("auth.login")}
        </Link>
      </p>
    </form>
  );
}
