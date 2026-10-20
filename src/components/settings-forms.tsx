"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { apiFetch } from "@/lib/client-api";
import { useI18n } from "./i18n";
import { LangToggle, ThemeToggle } from "./toggles";
import { Alert, Button, Card, Field, Input, Select, buttonClass } from "./ui";

interface Report {
  total: number; valid: number; imported: number; dryRun: boolean;
  invalid: { row: number; english: string; errors: string[] }[];
  duplicates: { row: number; english: string; reason: "exists" | "in-file" }[];
}

export function SettingsForms({ user, theme }: { user: { name: string; email: string; dailyGoal: number; timezone: string }; theme: "light" | "dark" | "system" }) {
  const { t, n, err } = useI18n();
  const router = useRouter();
  const [profile, setProfile] = useState({ name: user.name, dailyGoal: String(user.dailyGoal), timezone: user.timezone });
  const [pMsg, setPMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });
  const [pwMsg, setPwMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const zones = useMemo(() => {
    const list = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
    return list.includes(profile.timezone) ? list : [profile.timezone, ...list];
  }, [profile.timezone]);

  const [csv, setCsv] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [importMsg, setImportMsg] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy("profile"); setPMsg(null);
    try {
      await apiFetch("/api/settings", { method: "PATCH", json: { name: profile.name, dailyGoal: Number(profile.dailyGoal), timezone: profile.timezone } });
      setPMsg({ tone: "success", text: t("common.saved") });
      router.refresh();
    } catch (e2) { setPMsg({ tone: "error", text: err(e2) }); } finally { setBusy(null); }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy("pw"); setPwMsg(null);
    try {
      await apiFetch("/api/settings/password", { method: "POST", json: pw });
      setPw({ currentPassword: "", newPassword: "" });
      setPwMsg({ tone: "success", text: t("set.passwordChanged") });
    } catch (e2) { setPwMsg({ tone: "error", text: err(e2) }); } finally { setBusy(null); }
  }

  async function onFile(file: File | undefined) {
    setReport(null); setImportMsg(null); setCsv(null);
    if (!file) return;
    setFileName(file.name);
    setCsv(await file.text());
  }

  async function runImport(dryRun: boolean) {
    if (!csv) { setImportMsg({ tone: "error", text: t("set.noFile") }); return; }
    setBusy("import"); setImportMsg(null);
    try {
      const r = await apiFetch<Report>("/api/import", { method: "POST", json: { csv, dryRun } });
      setReport(r);
      if (!dryRun) { setImportMsg({ tone: "success", text: t("set.importDone", { n: n(r.imported) }) }); setCsv(null); setFileName(""); router.refresh(); }
    } catch (e2) { setImportMsg({ tone: "error", text: err(e2) }); } finally { setBusy(null); }
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">{t("set.interface")}</h2>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <div><p className="mb-1.5 text-sm font-medium">{t("set.language")}</p><LangToggle /></div>
          <div><p className="mb-1.5 text-sm font-medium">{t("set.theme")}</p><ThemeToggle theme={theme} /></div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">{t("set.account")}</h2>
        <form onSubmit={saveProfile} className="space-y-4">
          <Field id="s-email" label={t("set.email")}><Input id="s-email" dir="ltr" value={user.email} readOnly aria-readonly /></Field>
          <Field id="s-name" label={t("set.name")}><Input id="s-name" value={profile.name} maxLength={60} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="s-goal" label={t("set.dailyGoal")}><Input id="s-goal" type="number" inputMode="numeric" min={1} max={200} value={profile.dailyGoal} onChange={(e) => setProfile({ ...profile, dailyGoal: e.target.value })} /></Field>
            <Field id="s-tz" label={t("set.timezone")}>
              <Select id="s-tz" dir="ltr" value={profile.timezone} onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}>
                {zones.map((z) => <option key={z} value={z}>{z}</option>)}
              </Select>
            </Field>
          </div>
          {pMsg && <Alert tone={pMsg.tone}>{pMsg.text}</Alert>}
          <Button type="submit" disabled={busy === "profile"}>{t("set.saveProfile")}</Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">{t("set.password")}</h2>
        <form onSubmit={changePassword} className="space-y-4">
          <Field id="cur-pw" label={t("set.currentPassword")}><Input id="cur-pw" type="password" dir="ltr" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required /></Field>
          <Field id="new-pw" label={t("set.newPassword")} hint={t("auth.passwordHint")}><Input id="new-pw" type="password" dir="ltr" autoComplete="new-password" minLength={8} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required /></Field>
          {pwMsg && <Alert tone={pwMsg.tone}>{pwMsg.text}</Alert>}
          <Button type="submit" variant="secondary" disabled={busy === "pw"}>{t("set.changePassword")}</Button>
        </form>
      </Card>

      <Card className="space-y-6">
        <h2 className="text-lg font-semibold">{t("set.data")}</h2>
        <section>
          <h3 className="font-medium">{t("set.exportTitle")}</h3>
          <p className="mb-3 mt-1 text-sm text-muted">{t("set.exportBody")}</p>
          <a href="/api/export" download className={buttonClass("secondary", "md")} style={{ color: "inherit" }}><Download className="size-4" aria-hidden />{t("set.exportBtn")}</a>
        </section>
        <section className="border-t border-line pt-6">
          <h3 className="font-medium">{t("set.importTitle")}</h3>
          <p className="mb-3 mt-1 text-sm text-muted" dir="auto">{t("set.importBody")}</p>
          <div className="space-y-3">
            <div>
              <label htmlFor="csv-file" className={buttonClass("secondary", "md", "cursor-pointer")}>{t("set.chooseFile")}</label>
              <input id="csv-file" type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => void onFile(e.target.files?.[0])} />
              {fileName && <span className="ms-3 text-sm text-muted" dir="ltr">{fileName}</span>}
            </div>
            {csv && !report && <Button onClick={() => runImport(true)} disabled={busy === "import"}>{t("set.checkFile")}</Button>}
            {importMsg && <Alert tone={importMsg.tone}>{importMsg.text}</Alert>}
            {report && (
              <div className="space-y-3" aria-live="polite">
                <p className="font-medium">{report.dryRun ? t("set.importValid", { n: n(report.valid) }) : t("set.importDone", { n: n(report.imported) })}</p>
                {report.invalid.length > 0 && (
                  <div>
                    <p className="mb-1 text-sm font-medium text-bad">{t("set.importInvalid", { n: n(report.invalid.length) })}</p>
                    <ul className="max-h-48 space-y-1 overflow-auto rounded-lg border border-line p-2 text-sm">
                      {report.invalid.map((r) => <li key={`${r.row}-${r.english}`}><strong>{t("set.row", { n: n(r.row) })}</strong> <span dir="auto">{r.english}</span> — {r.errors.join("; ")}</li>)}
                    </ul>
                  </div>
                )}
                {report.duplicates.length > 0 && (
                  <div>
                    <p className="mb-1 text-sm font-medium">{t("set.importDuplicates", { n: n(report.duplicates.length) })}</p>
                    <ul className="max-h-40 space-y-1 overflow-auto rounded-lg border border-line p-2 text-sm">
                      {report.duplicates.map((r) => <li key={`${r.row}-${r.english}`}><strong>{t("set.row", { n: n(r.row) })}</strong> <span dir="auto">{r.english}</span> — {r.reason === "exists" ? t("set.dupExists") : t("set.dupInFile")}</li>)}
                    </ul>
                  </div>
                )}
                {report.dryRun && report.valid > 0 && <Button onClick={() => runImport(false)} disabled={busy === "import"}>{t("set.confirmImport", { n: n(report.valid) })}</Button>}
              </div>
            )}
          </div>
        </section>
      </Card>
    </div>
  );
}
