// ⚠️  A GEMINI_API_KEY foi movida para o servidor (api/chat.ts).
// Este ficheiro já não expõe nenhuma chave no browser.

export type GeminiPart =
  | { text: string }
  | { inlineData: { data: string; mimeType: string } };

export interface GeminiResponse {
  text: string | null;
  functionCalls: Array<{ name: string; args: Record<string, unknown> }>;
}

/**
 * Envia as parts para o proxy serverless /api/chat.
 * A chave Gemini nunca chega ao browser.
 */
export async function callGemini(parts: GeminiPart[]): Promise<GeminiResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parts }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Erro HTTP ${res.status}`);
  }

  return res.json();
}
