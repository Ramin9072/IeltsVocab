"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Repeat, Square, Turtle, Volume2 } from "lucide-react";
import { pickVoice } from "@/lib/speech";
import { useI18n } from "./i18n";
import { Button } from "./ui";

const GAP_MS = 700; // pause between repeats so the learner can echo the word

const noopSubscribe = () => () => {};
const detectSupport = () => "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

function useSpeech() {
  // null on the server and during hydration, the real answer afterwards (no hydration mismatch)
  const supported = useSyncExternalStore<boolean | null>(noopSubscribe, detectSupport, () => null);
  const [speaking, setSpeaking] = useState(false);
  const voice = useRef<SpeechSynthesisVoice | null>(null);
  const run = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    run.current++;
    if (timer.current) clearTimeout(timer.current);
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    const load = () => { voice.current = pickVoice(synth.getVoices()); };
    load();
    synth.addEventListener("voiceschanged", load); // voices arrive asynchronously in Chrome
    return () => {
      synth.removeEventListener("voiceschanged", load);
      stop();
    };
  }, [supported, stop]);

  const speak = useCallback((text: string, opts: { rate?: number; times?: number } = {}) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const { rate = 1, times = 1 } = opts;
    const synth = window.speechSynthesis;
    synth.cancel();
    if (timer.current) clearTimeout(timer.current);
    const token = ++run.current;
    let played = 0;
    setSpeaking(true);
    const next = () => {
      if (token !== run.current) return;
      played++;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = voice.current?.lang ?? "en-US";
      if (voice.current) u.voice = voice.current;
      u.rate = rate;
      u.onend = () => {
        if (token !== run.current) return;
        if (played < times) timer.current = setTimeout(next, GAP_MS);
        else setSpeaking(false);
      };
      u.onerror = () => { if (token === run.current) setSpeaking(false); };
      synth.speak(u);
    };
    next();
  }, []);

  return { supported, speaking, speak, stop };
}

/**
 * Reads English text aloud with the device's own voices (Web Speech API): no server, key or cost.
 * "icon" is a single round button; "full" adds slow playback and a 3x repeat for shadowing practice.
 */
export function SpeakButton({ text, variant = "icon" }: { text: string; variant?: "icon" | "full" }) {
  const { t } = useI18n();
  const { supported, speaking, speak, stop } = useSpeech();
  if (supported === null) return null;
  if (!supported) return variant === "full" ? <p className="text-sm text-muted">{t("speak.unsupported")}</p> : null;

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={() => (speaking ? stop() : speak(text))}
        aria-label={`${speaking ? t("speak.stop") : t("speak.listen")}: ${text}`}
        aria-pressed={speaking}
        className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-primary hover:bg-sunken"
      >
        {speaking ? <Square className="size-4" aria-hidden /> : <Volume2 className="size-5" aria-hidden />}
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("speak.title")}>
      <Button size="sm" onClick={() => speak(text)}><Volume2 className="size-4" aria-hidden />{t("speak.listen")}</Button>
      <Button size="sm" variant="secondary" onClick={() => speak(text, { rate: 0.6 })}><Turtle className="size-4" aria-hidden />{t("speak.slow")}</Button>
      <Button size="sm" variant="secondary" onClick={() => speak(text, { times: 3 })}><Repeat className="size-4" aria-hidden />{t("speak.repeat")}</Button>
      {speaking && <Button size="sm" variant="ghost" onClick={stop}><Square className="size-4" aria-hidden />{t("speak.stop")}</Button>}
    </div>
  );
}
