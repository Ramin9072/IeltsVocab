"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/client-api";
import { PARTS_OF_SPEECH, type VocabView } from "@/lib/types";
import type { MsgKey } from "@/lib/i18n";
import { DictateButton } from "./dictate-button";
import { useI18n } from "./i18n";
import { Alert, Badge, Button, Card, Field, Input, Select, Spinner, Textarea } from "./ui";

interface Suggestion {
  persian?: string; definition?: string; example?: string; partOfSpeech?: string; pronunciation?: string;
  synonyms?: string[]; antonyms?: string[]; collocations?: string[]; commonMistakes?: string[]; relatedForms?: string[];
}
type Mode = "translate" | "define" | "enrich";

const splitList = (s: string) => s.split(/[,،;؛]/).map((x) => x.trim()).filter(Boolean);

export function VocabForm({
  mode, initial, collections, assistConfigured, defaultCollectionId,
}: {
  mode: "add" | "edit";
  initial?: VocabView;
  collections: { id: string; name: string }[];
  assistConfigured: boolean;
  defaultCollectionId?: string;
}) {
  const { t, err } = useI18n();
  const router = useRouter();
  const englishRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({
    english: initial?.english ?? "",
    persian: initial?.persian ?? "",
    definition: initial?.definition ?? "",
    example: initial?.example ?? "",
    partOfSpeech: initial?.partOfSpeech ?? "",
    synonyms: initial?.synonyms.join(", ") ?? "",
    antonyms: initial?.antonyms.join(", ") ?? "",
    pronunciation: initial?.pronunciation ?? "",
    tags: initial?.tags.join(", ") ?? "",
    collectionId: initial?.collectionId ?? defaultCollectionId ?? "",
    notes: initial?.notes ?? "",
    difficulty: initial?.difficulty ?? "medium",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ message: string; existingId?: string } | null>(null);
  const [fieldErr, setFieldErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyMode, setBusyMode] = useState<Mode | null>(null);
  const [assistError, setAssistError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<{ data: Suggestion; cached: boolean } | null>(null);
  const [applied, setApplied] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  useEffect(() => { if (mode === "add") englishRef.current?.focus(); }, [mode]);

  async function runAssist(m: Mode) {
    setAssistError(null);
    setSuggestion(null);
    setApplied(false);
    if (!f.english.trim()) { setAssistError(t("assist.enterText")); englishRef.current?.focus(); return; }
    setBusyMode(m);
    try {
      const res = await apiFetch<{ result: Suggestion; cached: boolean }>("/api/translate", { method: "POST", json: { text: f.english.trim(), mode: m } });
      setSuggestion({ data: res.result, cached: res.cached });
    } catch (e) {
      setAssistError(err(e));
    } finally {
      setBusyMode(null);
    }
  }

  // Applying only fills the editable form. Nothing is stored until the user presses Save.
  function applySuggestion() {
    if (!suggestion) return;
    const s = suggestion.data;
    const extra = [
      s.collocations?.length ? `${t("assist.collocations")}: ${s.collocations.join("; ")}` : "",
      s.commonMistakes?.length ? `${t("assist.mistakes")}: ${s.commonMistakes.join("; ")}` : "",
      s.relatedForms?.length ? `${t("assist.forms")}: ${s.relatedForms.join("; ")}` : "",
    ].filter(Boolean);
    setF((p) => ({
      ...p,
      persian: s.persian || p.persian,
      definition: s.definition || p.definition,
      example: s.example || p.example,
      partOfSpeech: s.partOfSpeech || p.partOfSpeech,
      pronunciation: s.pronunciation || p.pronunciation,
      synonyms: s.synonyms?.length ? s.synonyms.join(", ") : p.synonyms,
      antonyms: s.antonyms?.length ? s.antonyms.join(", ") : p.antonyms,
      notes: extra.length ? [p.notes, ...extra].filter(Boolean).join("\n") : p.notes,
    }));
    setApplied(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError(null);
    setSuccess(null);
    if (!f.english.trim()) { setFieldErr(t("assist.enterText")); englishRef.current?.focus(); return; }
    setFieldErr(null);
    setSaving(true);
    const body = {
      ...f,
      synonyms: splitList(f.synonyms),
      antonyms: splitList(f.antonyms),
      tags: splitList(f.tags),
      collectionId: f.collectionId || null,
    };
    try {
      if (mode === "add") {
        await apiFetch("/api/vocab", { method: "POST", json: body });
        setSuccess(t("vocab.created"));
        setSuggestion(null);
        setApplied(false);
        setF((p) => ({ ...p, english: "", persian: "", definition: "", example: "", partOfSpeech: "", synonyms: "", antonyms: "", pronunciation: "", tags: "", notes: "" }));
        englishRef.current?.focus();
        router.refresh();
      } else {
        await apiFetch(`/api/vocab/${initial!.id}`, { method: "PUT", json: body });
        router.push(`/vocab/${initial!.id}`);
        router.refresh();
      }
    } catch (e2) {
      const existingId = e2 instanceof ApiError && e2.code === "duplicate" ? (e2.details as { existingId?: string } | undefined)?.existingId ?? undefined : undefined;
      setError({ message: e2 instanceof ApiError && e2.code === "duplicate" ? t("vocab.duplicate") : err(e2), existingId });
    } finally {
      setSaving(false);
    }
  }

  const sg = suggestion?.data;
  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {success && <Alert tone="success">{success}</Alert>}
      {error && (
        <Alert tone="error">
          {error.message}{" "}
          {error.existingId && <Link href={`/vocab/${error.existingId}`}>{t("vocab.openExisting")}</Link>}
        </Alert>
      )}

      <Field id="english" label={t("vocab.english")} error={fieldErr ?? undefined}>
        <div className="flex flex-wrap items-center gap-2">
          <Input ref={englishRef} id="english" dir="ltr" lang="en" className="min-w-0 flex-1" value={f.english} onChange={set("english")} maxLength={500} required aria-invalid={Boolean(fieldErr)} aria-describedby={fieldErr ? "english-err" : undefined} />
          <DictateButton lang="en" onText={(text) => setF((p) => ({ ...p, english: text }))} />
        </div>
      </Field>

      <Card className="space-y-3 bg-sunken/50">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="me-auto flex items-center gap-2 text-base font-semibold"><Sparkles className="size-4 text-saffron" aria-hidden />{t("assist.title")}</h2>
          {(["translate", "define", "enrich"] as const).map((m) => (
            <Button key={m} size="sm" variant="secondary" disabled={!assistConfigured || busyMode !== null} onClick={() => runAssist(m)}>
              {t(`assist.${m}` as MsgKey)}
            </Button>
          ))}
        </div>
        <p className="text-sm text-muted">{t("assist.help")}</p>
        {!assistConfigured && <Alert>{t("assist.notConfigured")}</Alert>}
        {busyMode && <Spinner label={t("common.loading")} />}
        {assistError && <Alert tone="error">{assistError}</Alert>}
        {sg && (
          <div className="space-y-3 rounded-lg border border-line bg-surface p-3" aria-live="polite">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{t("assist.result")}</h3>
              {suggestion.cached && <Badge>{t("assist.cached")}</Badge>}
            </div>
            <dl className="grid gap-2 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">
              {sg.persian && (<><dt className="text-muted">{t("vocab.persian")}</dt><dd dir="rtl" lang="fa">{sg.persian}</dd></>)}
              {sg.partOfSpeech && (<><dt className="text-muted">{t("vocab.pos")}</dt><dd>{t(`pos.${sg.partOfSpeech}` as MsgKey)}</dd></>)}
              {sg.pronunciation && (<><dt className="text-muted">{t("vocab.pronunciation")}</dt><dd dir="ltr">{sg.pronunciation}</dd></>)}
              {sg.definition && (<><dt className="text-muted">{t("vocab.definition")}</dt><dd dir="ltr">{sg.definition}</dd></>)}
              {sg.example && (<><dt className="text-muted">{t("vocab.example")}</dt><dd dir="ltr">{sg.example}</dd></>)}
              {!!sg.synonyms?.length && (<><dt className="text-muted">{t("vocab.synonyms")}</dt><dd dir="ltr">{sg.synonyms.join(", ")}</dd></>)}
              {!!sg.antonyms?.length && (<><dt className="text-muted">{t("vocab.antonyms")}</dt><dd dir="ltr">{sg.antonyms.join(", ")}</dd></>)}
              {!!sg.collocations?.length && (<><dt className="text-muted">{t("assist.collocations")}</dt><dd dir="ltr">{sg.collocations.join("; ")}</dd></>)}
              {!!sg.commonMistakes?.length && (<><dt className="text-muted">{t("assist.mistakes")}</dt><dd dir="ltr">{sg.commonMistakes.join("; ")}</dd></>)}
              {!!sg.relatedForms?.length && (<><dt className="text-muted">{t("assist.forms")}</dt><dd dir="ltr">{sg.relatedForms.join("; ")}</dd></>)}
            </dl>
            {applied ? <Alert tone="success">{t("assist.applied")}</Alert> : <Button size="sm" onClick={applySuggestion}>{t("assist.apply")}</Button>}
          </div>
        )}
      </Card>

      <Field id="persian" label={t("vocab.persian")} optional={t("common.optional")}>
        <div className="flex flex-wrap items-center gap-2">
          <Input id="persian" dir="rtl" lang="fa" className="min-w-0 flex-1" value={f.persian} onChange={set("persian")} maxLength={500} />
          <DictateButton lang="fa" onText={(text) => setF((p) => ({ ...p, persian: text }))} />
        </div>
      </Field>
      <Field id="definition" label={t("vocab.definition")} optional={t("common.optional")}>
        <Textarea id="definition" dir="ltr" lang="en" value={f.definition} onChange={set("definition")} maxLength={1000} rows={2} />
      </Field>
      <Field id="example" label={t("vocab.example")} optional={t("common.optional")}>
        <Textarea id="example" dir="ltr" lang="en" value={f.example} onChange={set("example")} maxLength={1000} rows={2} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="pos" label={t("vocab.pos")}>
          <Select id="pos" value={f.partOfSpeech} onChange={set("partOfSpeech")}>
            <option value="">{t("vocab.pos.none")}</option>
            {PARTS_OF_SPEECH.map((p) => <option key={p} value={p}>{t(`pos.${p}` as MsgKey)}</option>)}
          </Select>
        </Field>
        <Field id="difficulty" label={t("vocab.difficulty")}>
          <Select id="difficulty" value={f.difficulty} onChange={set("difficulty")}>
            {(["easy", "medium", "hard"] as const).map((d) => <option key={d} value={d}>{t(`vocab.diff.${d}` as MsgKey)}</option>)}
          </Select>
        </Field>
        <Field id="collection" label={t("vocab.collection")}>
          <Select id="collection" value={f.collectionId} onChange={set("collectionId")}>
            <option value="">{t("vocab.noCollection")}</option>
            {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
      </div>

      <details className="group rounded-card border border-line bg-surface p-4" open={mode === "edit" || undefined}>
        <summary className="cursor-pointer font-medium">{t("vocab.more")}</summary>
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="synonyms" label={t("vocab.synonyms")} hint={t("vocab.listHint")}><Input id="synonyms" dir="ltr" lang="en" value={f.synonyms} onChange={set("synonyms")} /></Field>
            <Field id="antonyms" label={t("vocab.antonyms")} hint={t("vocab.listHint")}><Input id="antonyms" dir="ltr" lang="en" value={f.antonyms} onChange={set("antonyms")} /></Field>
            <Field id="pronunciation" label={t("vocab.pronunciation")}><Input id="pronunciation" dir="ltr" value={f.pronunciation} onChange={set("pronunciation")} maxLength={100} /></Field>
            <Field id="tags" label={t("vocab.tags")} hint={t("vocab.listHint")}><Input id="tags" value={f.tags} onChange={set("tags")} /></Field>
          </div>
          <Field id="notes" label={t("vocab.notes")}><Textarea id="notes" value={f.notes} onChange={set("notes")} maxLength={2000} rows={3} /></Field>
        </div>
      </details>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg" disabled={saving}>{saving ? t("common.loading") : mode === "add" ? t("vocab.save") : t("vocab.saveChanges")}</Button>
        {mode === "edit" && <Link href={`/vocab/${initial!.id}`} className="inline-flex min-h-12 items-center px-4 font-medium">{t("common.cancel")}</Link>}
      </div>
    </form>
  );
}
