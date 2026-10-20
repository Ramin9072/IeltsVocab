"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { apiFetch } from "@/lib/client-api";
import { PRACTICE_MODES, type PracticeMode } from "@/lib/schemas";
import type { MsgKey } from "@/lib/i18n";
import { useI18n } from "./i18n";
import { DictateButton, useRecognitionSupport } from "./dictate-button";
import { scoreSpeech } from "@/lib/speech-score";
import { SpeakButton } from "./speak-button";
import { Alert, Button, Card, EmptyState, Field, Input, LinkButton, ProgressBar, ReviewLadder, Select, Spinner, Textarea, cn } from "./ui";

type Kind = "en-fa" | "fa-en" | "def-en" | "type" | "speak";
interface Question { id: string; vocabId: string; kind: Kind; prompt: string; options?: string[]; local?: boolean }
interface Result {
  correct: boolean; correctAnswer: string; level?: number; nextReviewAt?: number; practiceCount?: number;
  score?: number; words?: { word: string; ok: boolean }[]; heard?: string; // pronunciation check
}
const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`);
interface LogItem { q: Question; answer: string; result: Result }
type Source = "all" | "collection" | "selected";

const promptDir = (k: Kind) => (k === "en-fa" || k === "def-en" || k === "speak" ? "ltr" : k === "fa-en" ? "rtl" : "auto");
const optionDir = (k: Kind) => (k === "en-fa" ? "rtl" : "ltr");

export function PracticeApp({ collections, totalWords }: { collections: { id: string; name: string; count: number }[]; totalWords: number }) {
  const { t, n, when, err } = useI18n();
  const [phase, setPhase] = useState<"setup" | "loading" | "run" | "done">("setup");
  const [mode, setMode] = useState<PracticeMode>("multiple-choice");
  const [count, setCount] = useState(10);
  const [source, setSource] = useState<Source>("all");
  const [collectionId, setCollectionId] = useState(collections[0]?.id ?? "");
  const [wordFilter, setWordFilter] = useState<"any" | "new" | "practiced">("any");
  const [setupError, setSetupError] = useState<string | null>(null);

  const speechOk = useRecognitionSupport();
  const [heard, setHeard] = useState<string | null>(null);
  const [own, setOwn] = useState("");
  const [picked, setPicked] = useState<Map<string, string>>(new Map());
  const [pickQuery, setPickQuery] = useState("");
  const [pickResults, setPickResults] = useState<{ id: string; english: string }[]>([]);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [log, setLog] = useState<LogItem[]>([]);
  const nextRef = useRef<HTMLButtonElement>(null);
  const typeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (source !== "selected") return;
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      try {
        const res = await apiFetch<{ items: { id: string; english: string }[] }>(`/api/vocab?pageSize=30&sort=alpha&q=${encodeURIComponent(pickQuery)}`, { signal: ctrl.signal });
        setPickResults(res.items);
      } catch { /* ignore aborted/failed lookups; the list simply stays as it was */ }
    }, 250);
    return () => { clearTimeout(id); ctrl.abort(); };
  }, [source, pickQuery]);

  useEffect(() => { if (result) nextRef.current?.focus(); else if (phase === "run") typeRef.current?.focus(); }, [result, idx, phase]);

  if (totalWords === 0) {
    return <EmptyState title={t("practice.nothing")} body={t("practice.fewWords")} action={<LinkButton href="/add">{t("nav.add")}</LinkButton>} />;
  }

  async function start() {
    setSetupError(null);
    if (source === "selected" && picked.size === 0) { setSetupError(t("practice.nothing")); return; }
    setPhase("loading");
    try {
      const res = await apiFetch<{ questions: Question[]; skipped: number }>("/api/practice/session", {
        method: "POST",
        json: {
          mode, count, wordFilter: source === "selected" ? "any" : wordFilter,
          collectionId: source === "collection" ? collectionId : null,
          ids: source === "selected" ? [...picked.keys()] : undefined,
        },
      });
      setQuestions(res.questions); setSkipped(res.skipped); setIdx(0); setLog([]); setResult(null); setSelected(null); setTyped(""); setHeard(null); setAnswerError(null);
      setPhase("run");
    } catch (e) {
      setSetupError(err(e));
      setPhase("setup");
    }
  }

  function startOwn() {
    const text = own.trim();
    if (!text) return;
    // A sentence you typed yourself is scored in the browser and is not saved or counted.
    setQuestions([{ id: newId(), vocabId: "", kind: "speak", prompt: text, local: true }]);
    setSkipped(0); setIdx(0); setLog([]); setResult(null); setSelected(null); setTyped(""); setHeard(null); setAnswerError(null);
    setPhase("run");
  }

  async function submit(answer: string) {
    const q = questions[idx];
    if (submitting || result) return;
    if (q.local) {
      const s = scoreSpeech(q.prompt, answer);
      const r: Result = { correct: s.correct, correctAnswer: q.prompt, score: Math.round(s.score * 100), words: s.words, heard: answer };
      setResult(r);
      setLog((l) => [...l, { q, answer, result: r }]);
      return;
    }
    setSubmitting(true);
    setAnswerError(null);
    try {
      // The question id doubles as the idempotency key: a retry or double-click can never count twice.
      const r = await apiFetch<Result>("/api/practice/answer", { method: "POST", json: { requestId: q.id, vocabId: q.vocabId, kind: q.kind, answer } });
      setResult(r);
      setLog((l) => [...l, { q, answer, result: r }]);
    } catch {
      setAnswerError(t("practice.retryHint"));
    } finally {
      setSubmitting(false);
    }
  }

  function advance() {
    if (idx + 1 >= questions.length) { setPhase("done"); return; }
    setIdx(idx + 1); setResult(null); setSelected(null); setTyped(""); setHeard(null); setAnswerError(null);
  }

  if (phase === "loading") return <p className="py-16 text-center"><Spinner label={t("practice.starting")} /></p>;

  if (phase === "run") {
    const q = questions[idx];
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between text-sm text-muted">
            <span>{t("practice.progress", { n: n(idx + 1), total: n(questions.length) })}</span>
            <span>{t(`practice.mode.${mode}` as MsgKey)}</span>
          </div>
          <ProgressBar value={idx + (result ? 1 : 0)} max={questions.length} label={t("practice.progress", { n: n(idx + 1), total: n(questions.length) })} />
        </div>

        <Card className="space-y-5 p-5 sm:p-7">
          <div>
            <p className="text-sm text-muted">{t(`practice.q.${q.kind}` as MsgKey)}</p>
            <div className="mt-2 flex items-center gap-3">
              <p className={cn("font-display font-bold", q.kind === "speak" ? "text-2xl" : "text-3xl sm:text-4xl")} dir={promptDir(q.kind)} lang={q.kind === "fa-en" ? "fa" : undefined}>{q.prompt}</p>
              {q.kind === "en-fa" && <SpeakButton text={q.prompt} />}
            </div>
          </div>

          {q.kind === "speak" ? (
            <div className="space-y-3">
              <SpeakButton text={q.prompt} variant="full" />
              {!result && (heard === null ? (
                <div className="flex flex-wrap items-center gap-2"><DictateButton lang="en" variant="wide" onText={setHeard} /></div>
              ) : (
                <div className="space-y-3 rounded-lg border border-line bg-sunken/50 p-3">
                  <p className="text-sm text-muted">{t("speaking.heard")}</p>
                  <p dir="ltr" lang="en" className="text-lg">{heard}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => void submit(heard)} disabled={submitting}>{t("speaking.check")}</Button>
                    <Button variant="secondary" onClick={() => setHeard(null)} disabled={submitting}>{t("speaking.retry")}</Button>
                  </div>
                </div>
              ))}
            </div>
          ) : q.options ? (
            <ul className="grid gap-2.5" aria-label={t(`practice.q.${q.kind}` as MsgKey)}>
              {q.options.map((o) => {
                const isCorrect = result && o === result.correctAnswer;
                const isWrongPick = result && !result.correct && o === selected;
                return (
                  <li key={o}>
                    <button
                      type="button"
                      dir={optionDir(q.kind)}
                      lang={q.kind === "en-fa" ? "fa" : "en"}
                      disabled={submitting || result !== null}
                      aria-pressed={selected === o}
                      onClick={() => { setSelected(o); void submit(o); }}
                      className={cn(
                        "flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border px-4 py-2 text-start text-lg transition-colors",
                        !result && "border-line bg-surface hover:border-primary hover:bg-sunken",
                        isCorrect && "border-ok bg-ok/10",
                        isWrongPick && "border-bad bg-bad/10",
                        result && !isCorrect && !isWrongPick && "border-line opacity-60",
                      )}
                    >
                      <span>{o}</span>
                      {isCorrect && <CheckCircle2 className="size-5 shrink-0 text-ok" aria-label={t("practice.correct")} />}
                      {isWrongPick && <XCircle className="size-5 shrink-0 text-bad" aria-label={t("practice.wrong")} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); if (typed.trim()) void submit(typed); }} className="space-y-3">
              <Field id="typed" label={t("practice.typeHere")}>
                <div className="flex flex-wrap items-center gap-2">
                  <Input ref={typeRef} id="typed" dir="ltr" lang="en" className="min-w-0 flex-1" value={typed} onChange={(e) => setTyped(e.target.value)} disabled={submitting || result !== null} autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={500} />
                  {!result && <DictateButton lang="en" onText={setTyped} />}
                </div>
              </Field>
              {!result && <Button type="submit" disabled={submitting || !typed.trim()}>{submitting ? t("practice.submitting") : t("practice.check")}</Button>}
            </form>
          )}

          {submitting && <Spinner label={t("practice.submitting")} />}
          {answerError && <Alert tone="error">{answerError}</Alert>}

          {result && (
            <div aria-live="polite" className={cn("space-y-3 rounded-lg border p-4", result.correct ? "border-ok/40 bg-ok/10" : "border-bad/40 bg-bad/10")}>
              <p className="flex items-center gap-2 text-lg font-semibold">
                {result.correct ? <CheckCircle2 className="size-5 text-ok" aria-hidden /> : <XCircle className="size-5 text-bad" aria-hidden />}
                {result.correct ? t("practice.correct") : t("practice.wrong")}
              </p>
              {!result.correct && q.kind !== "speak" && (
                <p>{t("practice.answerIs")}: <strong dir={q.kind === "en-fa" ? "rtl" : "ltr"} lang={q.kind === "en-fa" ? "fa" : "en"} className="inline-block">{result.correctAnswer}</strong></p>
              )}
              {q.kind !== "en-fa" && <SpeakButton text={result.correctAnswer} />}
              {q.kind === "speak" && result.words && (
                <div className="space-y-3">
                  <p className="font-medium">{t("speaking.score", { n: n(result.score ?? 0) })}</p>
                  <ul className="flex flex-wrap gap-1.5" dir="ltr" lang="en">
                    {result.words.map((w, i) => (
                      <li key={i} className={cn("rounded-md px-2 py-0.5 text-base", w.ok ? "bg-ok/15 text-ok" : "bg-bad/15 text-bad underline decoration-wavy")}>
                        {w.word}<span className="sr-only"> {w.ok ? t("practice.correct") : t("practice.wrong")}</span>
                      </li>
                    ))}
                  </ul>
                  {result.heard && <p className="text-sm text-muted">{t("speaking.heard")}: <span dir="ltr" lang="en">{result.heard}</span></p>}
                  {result.words.some((w) => !w.ok) ? (
                    <div>
                      <p className="mb-1 text-sm font-medium">{t("speaking.workOn")}</p>
                      <ul className="flex flex-wrap gap-2">
                        {[...new Set(result.words.filter((w) => !w.ok).map((w) => w.word))].map((w) => (
                          <li key={w} className="flex items-center gap-1" dir="ltr"><span lang="en">{w}</span><SpeakButton text={w} /></li>
                        ))}
                      </ul>
                    </div>
                  ) : <p className="text-sm text-ok">{t("speaking.allGood")}</p>}
                  <p className="text-sm text-muted">{t("speaking.note")}</p>
                </div>
              )}
              {result.level !== undefined && result.nextReviewAt !== undefined && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <ReviewLadder level={result.level} label={`${t("detail.level")}: ${n(result.level)} / ${n(6)}`} />
                  <p className="text-sm text-muted">{t("practice.nextReview", { when: when(result.nextReviewAt) })}</p>
                </div>
              )}
              <Button ref={nextRef} onClick={advance}>{idx + 1 >= questions.length ? t("practice.finish") : t("practice.next")}</Button>
            </div>
          )}
        </Card>
      </div>
    );
  }

  if (phase === "done") {
    const right = log.filter((l) => l.result.correct).length;
    const wrong = log.filter((l) => !l.result.correct);
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <Card className="text-center">
          <h2 className="text-lg text-muted">{t("practice.summary")}</h2>
          <p className="mt-2 font-display text-5xl font-bold">{t("practice.score", { c: n(right), t: n(log.length) })}</p>
          {log.length > 0 && <p className="mt-1 text-muted">{n(Math.round((right / log.length) * 100))}%</p>}
          {skipped > 0 && <Alert className="mt-4 text-start">{t("practice.skipped", { n: n(skipped) })}</Alert>}
          {log.some((l) => l.q.local) && <Alert className="mt-4 text-start">{t("speaking.ownNote")}</Alert>}
        </Card>
        <Card>
          <h3 className="mb-2 font-semibold">{t("practice.reviewMistakes")}</h3>
          {wrong.length === 0 ? <p className="text-muted">{t("practice.noMistakes")}</p> : (
            <ul className="divide-y divide-line">
              {wrong.map((l) => (
                <li key={l.q.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                  <Link href={`/vocab/${l.q.vocabId}`} dir="auto">{l.q.prompt}</Link>
                  <span className="text-sm"><span className="text-bad" dir="auto">{l.answer}</span> → <strong dir="auto">{l.result.correctAnswer}</strong></span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <div className="flex flex-wrap gap-3">
          <Button size="lg" onClick={() => { setPhase("setup"); }}>{t("practice.again")}</Button>
          <LinkButton href="/dashboard" variant="secondary" size="lg">{t("practice.toDashboard")}</LinkButton>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {setupError && <Alert tone="error">{setupError}</Alert>}
      <fieldset>
        <legend className="mb-2 font-semibold">{t("practice.mode")}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {PRACTICE_MODES.map((m) => (
            <label key={m} className={cn("flex cursor-pointer gap-3 rounded-card border p-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-primary", mode === m ? "border-primary bg-primary/10" : "border-line bg-surface hover:bg-sunken")}>
              <input type="radio" name="mode" value={m} checked={mode === m} disabled={m === "speaking" && speechOk === false} onChange={() => setMode(m)} className="mt-1.5 accent-[rgb(var(--primary))]" />
              <span><span className="block font-medium">{t(`practice.mode.${m}` as MsgKey)}</span><span className="block text-sm text-muted">{t(`practice.desc.${m}` as MsgKey)}</span>{m === "speaking" && speechOk === false && <span className="block text-sm text-bad">{t("speaking.unsupported")}</span>}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {mode === "speaking" && speechOk && (
        <Card className="space-y-3 bg-sunken/50">
          <Field id="own-sentence" label={t("speaking.own")}>
            <Textarea id="own-sentence" dir="ltr" lang="en" value={own} onChange={(e) => setOwn(e.target.value)} maxLength={300} rows={2} placeholder={t("speaking.ownPlaceholder")} />
          </Field>
          <Button variant="secondary" onClick={startOwn} disabled={!own.trim()}>{t("speaking.ownStart")}</Button>
          <p className="text-sm text-muted">{t("speaking.ownNote")}</p>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="count" label={t("practice.count")}>
          <Select id="count" value={count} onChange={(e) => setCount(Number(e.target.value))}>
            {[5, 10, 15, 20, 30, 50].map((c) => <option key={c} value={c}>{n(c)}</option>)}
          </Select>
        </Field>
        <Field id="filter" label={t("practice.filter")}>
          <Select id="filter" value={wordFilter} disabled={source === "selected"} onChange={(e) => setWordFilter(e.target.value as typeof wordFilter)}>
            {(["any", "new", "practiced"] as const).map((f) => <option key={f} value={f}>{t(`practice.filter.${f}` as MsgKey)}</option>)}
          </Select>
        </Field>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-1 font-semibold">{t("practice.source")}</legend>
        {([["all", t("practice.sourceAll")], ["collection", t("practice.collection")], ["selected", t("practice.sourceSelected")]] as const)
          .filter(([v]) => v !== "collection" || collections.length > 0)
          .map(([v, label]) => (
            <label key={v} className="flex min-h-10 items-center gap-3">
              <input type="radio" name="source" value={v} checked={source === v} onChange={() => setSource(v)} className="accent-[rgb(var(--primary))]" />
              {label}
            </label>
          ))}
        {source === "collection" && (
          <Select aria-label={t("practice.collection")} value={collectionId} onChange={(e) => setCollectionId(e.target.value)}>
            {collections.map((c) => <option key={c.id} value={c.id}>{c.name} ({n(c.count)})</option>)}
          </Select>
        )}
        {source === "selected" && (
          <Card className="space-y-3 bg-sunken/50">
            <Input type="search" dir="auto" aria-label={t("common.search")} placeholder={t("lib.searchPlaceholder")} value={pickQuery} onChange={(e) => setPickQuery(e.target.value)} />
            <p className="text-sm text-muted" aria-live="polite">{t("practice.picked", { n: n(picked.size) })}</p>
            <ul className="max-h-56 space-y-1 overflow-auto">
              {pickResults.map((w) => (
                <li key={w.id}>
                  <label className="flex min-h-10 items-center gap-3">
                    <input type="checkbox" checked={picked.has(w.id)} className="size-4 accent-[rgb(var(--primary))]" onChange={(e) => setPicked((p) => { const m = new Map(p); if (e.target.checked) m.set(w.id, w.english); else m.delete(w.id); return m; })} />
                    <span dir="ltr" lang="en">{w.english}</span>
                  </label>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </fieldset>

      <Button size="lg" onClick={start} className="w-full sm:w-auto">{t("practice.start")}</Button>
    </div>
  );
}
