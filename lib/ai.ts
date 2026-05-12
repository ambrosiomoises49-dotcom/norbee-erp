// lib/ai.ts

export async function callAI<TResponse>({
  path,
  body,
}: {
  path: string;
  body: unknown;
}): Promise<TResponse | null> {
  const baseUrl = process.env.AI_SERVICE_URL;
  const apiKey = process.env.AI_SERVICE_API_KEY;

  if (!baseUrl || !apiKey || process.env.AI_ENABLED !== "true") {
    return null;
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Erro ao comunicar com o serviço IA.");
  }

  return res.json();
}