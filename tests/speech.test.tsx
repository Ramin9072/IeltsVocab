import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { pickVoice } from "@/lib/speech";
import { I18nProvider } from "@/components/i18n";
import { SpeakButton } from "@/components/speak-button";

describe("pronunciation voice choice", () => {
  const v = (lang: string, name = lang) => ({ lang, name });
  it("prefers US English, then any English voice, and ignores other languages", () => {
    expect(pickVoice([v("fa-IR"), v("en-GB"), v("en-US")])?.lang).toBe("en-US");
    expect(pickVoice([v("fa-IR"), v("en-GB")])?.lang).toBe("en-GB");
    expect(pickVoice([v("fa-IR"), v("fr-FR")])).toBeNull();
    expect(pickVoice([])).toBeNull();
  });
  it("understands Android-style locale names", () => {
    expect(pickVoice([v("en_GB"), v("en_US")])?.lang).toBe("en_US");
  });
});

describe("speak button", () => {
  it("renders nothing on the server (support is detected in the browser, so there is no hydration mismatch)", () => {
    const html = renderToStaticMarkup(<I18nProvider lang="fa"><SpeakButton text="resilient" /><SpeakButton text="resilient" variant="full" /></I18nProvider>);
    expect(html).toBe("");
  });
});

import { cleanDictation } from "@/lib/speech";
import { DictateButton } from "@/components/dictate-button";

describe("voice typing", () => {
  it("tidies what the speech engine returns", () => {
    expect(cleanDictation("Resilient.", "en")).toBe("resilient");
    expect(cleanDictation("  Take   off! ", "en")).toBe("Take off"); // only single words are lower-cased
    expect(cleanDictation("I live in London.", "en")).toBe("I live in London");
    expect(cleanDictation("مقاوم.", "fa")).toBe("مقاوم");
    expect(cleanDictation("همه جا حاضر؟", "fa")).toBe("همه جا حاضر");
    expect(cleanDictation("   ", "en")).toBe("");
  });
  it("renders nothing on the server, so unsupported browsers never see a dead button", () => {
    expect(renderToStaticMarkup(<I18nProvider lang="en"><DictateButton lang="en" onText={() => {}} /></I18nProvider>)).toBe("");
  });
});
