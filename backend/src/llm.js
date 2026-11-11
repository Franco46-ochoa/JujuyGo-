// Capa LLM opcional para redactar mensajes de yapa.
// Reglas: timeout corto, caché en memoria, nunca lanza — el caller usa fallback.
// La key vive solo en el backend (GEMINI_API_KEY). No enviar datos de usuarios:
// solo texto sobre lugares, horarios y contexto del viaje.

const MODELO = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const TIMEOUT_MS = 3000;
const cache = new Map();
const CACHE_MAX = 200;

function promptPara({ tipo, lugar, mensajeBase, contexto }) {
  return [
    'Sos el redactor de Yapa, una app de turismo en Jujuy, Argentina.',
    'Reescribí el siguiente mensaje en español rioplatense, cálido y breve (máximo 2 líneas, menos de 220 caracteres).',
    'Debe sonar a recomendación de alguien que conoce el lugar, no a brochure. Sin emojis. Sin inventar datos: solo lo que está en el mensaje base.',
    `Tipo de sugerencia: ${tipo}.`,
    `Lugar: ${lugar}.`,
    contexto ? `Contexto del viaje: ${contexto}.` : '',
    `Mensaje base: ${mensajeBase}`,
    'Respondé SOLO con el texto reescrito, sin comillas ni explicaciones.',
  ].filter(Boolean).join('\n');
}

export async function redactarYapa(entrada) {
  const key = [entrada.tipo, entrada.lugar, entrada.mensajeBase, entrada.contexto || ''].join('|');
  if (cache.has(key)) return cache.get(key);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptPara(entrada) }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 120 },
        }),
      },
    );
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json();
    const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!texto || texto.length > 400) return null;
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
    cache.set(key, texto);
    return texto;
  } catch {
    return null;
  }
}
