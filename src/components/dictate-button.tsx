"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Mic, Square } from "lucide-react";
import { cleanDictation } from "@/lib/speech";
import type { MsgKey } from "@/lib/i18n";
import { useI18n } from "./i18n";
import { cn } from "./ui";

// The browser's SpeechRecognition API is not in every TypeScript DOM lib, so describe the part we use.
interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

const ctor = (): RecognitionCtor | null => {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};
const noopSubscribe = () => () => {};

/**
 * Voice typing: press, speak, and the recognized text is typed into the field.
 * Uses the browser's SpeechRecognition (Chrome, Edge, Safari). It is hidden where unsupported (e.g. Firefox).
 * In Chrome the audio is processed by the browser vendor's speech service, so it needs an internet connection.
 */
/** null while detecting (server render / hydration), then true or false. */
export function useRecognitionSupport(): boolean | null {
  return useSyncExternalStore<boolean | null>(noopSubscribe, () => ctor() !== null, () => null);
}

export function DictateButton({ lang, onText, variant = "icon" }: { lang: "en" | "fa"; onText: (text: string) => void; variant?: "icon" | "wide" }) {
  const { t } = useI18n();
  const supported = useRecognitionSupport();
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState<MsgKey | null>(null);
  const rec = useRef<Recognition | null>(null);
  const heard = useRef(false);

  useEffect(() => () => rec.current?.abort(), []);

  const start = useCallback(() => {
    const Ctor = ctor();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = lang === "fa" ? "fa-IR" : "en-US";
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.continuous = false;
    heard.current = false;
    setMessage(null);
    r.onresult = (e) => {
      const text = cleanDictation(e.results[0]?.[0]?.transcript ?? "", lang);
      if (text) {
        heard.current = true;
        onText(text);
      }
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") setMessage("dictate.denied");
      else if (e.error === "no-speech") setMessage("dictate.none");
      else if (e.error !== "aborted") setMessage("dictate.failed");
    };
    r.onend = () => {
      setListening(false);
      rec.current = null;
    };
    rec.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      setMessage("dictate.failed");
    }
  }, [lang, onText]);

  if (!supported) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => (listening ? rec.current?.stop() : start())}
        aria-label={listening ? t("dictate.stop") : variant === "wide" ? t("speaking.tap") : t("dictate.start")}
        aria-pressed={listening}
        className={cn(
          variant === "wide"
            ? "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-5 text-base font-medium"
            : "grid size-11 shrink-0 place-items-center rounded-lg border border-line",
          listening
            ? "animate-pulse bg-bad text-white motion-reduce:animate-none"
            : variant === "wide"
              ? "bg-primary text-primary-ink hover:brightness-110"
              : "bg-surface text-primary hover:bg-sunken",
        )}
      >
        {listening ? <Square className="size-4" aria-hidden /> : <Mic className="size-5" aria-hidden />}
        {variant === "wide" && <span>{listening ? t("dictate.stop") : t("speaking.tap")}</span>}
      </button>
      <p role="status" className={cn("basis-full text-sm", message ? "text-bad" : "text-muted", !listening && !message && "sr-only")}>
        {listening ? t("dictate.listening") : message ? t(message) : ""}
      </p>
    </>
  );
}
