import { TranslationError, type TranslationProvider } from "./types";

function mapHttpError(status: number): TranslationError {
  if (status === 429) return new TranslationError("upstream_rate_limited", 503, "The translation service is busy. Try again in a minute.");
  if (status === 401 || status === 403) return new TranslationError("upstream_error", 502, "The translation service rejected the request. Check the server's API key.");
  return new TranslationError("upstream_error", 502, "The translation service had a problem. Try again later.");
}

async function post(url: string, init: RequestInit): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, cache: "no-store" });
  } catch (e) {
    if (e instanceof Error && (e.name === "AbortError" || e.name === "TimeoutError")) {
      throw new TranslationError("timeout", 504, "The translation service took too long. Try again.");
    }
    throw new TranslationError("upstream_error", 502, "Could not reach the translation service.");
  }
  if (!res.ok) {
    // Never forward the upstream body: it can echo request details.
    console.error("[translate] upstream status", res.status);
    throw mapHttpError(res.status);
  }
  try {
    return await res.json();
  } catch {
    throw new TranslationError("invalid_response", 502, "The translation service returned an unreadable response.");
  }
}

export function geminiProvider(apiKey: string, model = "gemini-flash-latest"): TranslationProvider {
  return {
    name: "gemini",
    model,
    async complete({ system, user, signal }) {
      const data = (await post(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
        }),
      })) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
      if (!text) throw new TranslationError("invalid_response", 502, "The translation service returned an empty answer.");
      return text;
    },
  };
}

/** Speaks the OpenAI chat-completions protocol: OpenAI, Groq, OpenRouter, Together, etc. */
export function openaiProvider(apiKey: string, model = "gpt-4o-mini", baseUrl = "https://api.openai.com/v1"): TranslationProvider {
  return {
    name: "openai",
    model,
    async complete({ system, user, signal }) {
      const data = (await post(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        signal,
        body: JSON.stringify({
          model,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      })) as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new TranslationError("invalid_response", 502, "The translation service returned an empty answer.");
      return text;
    },
  };
}

export function providerFromEnv(env: NodeJS.ProcessEnv = process.env): TranslationProvider | null {
  const name = env.TRANSLATION_PROVIDER?.trim().toLowerCase();
  const key = env.TRANSLATION_API_KEY?.trim();
  if (!name || !key) return null;
  const model = env.TRANSLATION_MODEL?.trim() || undefined;
  if (name === "gemini") return geminiProvider(key, model);
  if (name === "openai") return openaiProvider(key, model, env.TRANSLATION_BASE_URL?.trim() || undefined);
  return null;
}
