/** Proxy mínimo a un chat LLM OpenAI-compatible (default: OpenCode Go).
 * La key vive solo en el servidor (AI_API_KEY). */

export class AiNotConfigured extends Error {
  constructor() {
    super("IA no configurada todavía.");
  }
}

export async function aiChat(
  messages: { role: "system" | "user"; content: string }[],
  opts?: { maxTokens?: number; temperature?: number; session?: string }
): Promise<string> {
  const key = process.env.AI_API_KEY || "";
  if (!key) throw new AiNotConfigured();
  const base = (process.env.AI_BASE_URL || "https://opencode.ai/zen/go/v1").replace(/\/+$/, "");
  const model = process.env.AI_MODEL || "longcat-2.5-preview-free";
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 60_000);
  try {
    const r = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "User-Agent": "uy-jobs/1.0",
        "x-opencode-session": opts?.session ?? "uyjobs-general",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: opts?.maxTokens ?? 700,
        temperature: opts?.temperature ?? 0.7,
      }),
      signal: ctrl.signal,
    });
    if (r.status === 429) throw new Error("La IA está saturada, probá en un minuto.");
    if (!r.ok) throw new Error(`La IA falló (código ${r.status}).`);
    const d = await r.json();
    const text = String(d?.choices?.[0]?.message?.content ?? "").trim();
    if (!text) throw new Error("La IA no devolvió texto.");
    return text;
  } finally {
    clearTimeout(t);
  }
}
