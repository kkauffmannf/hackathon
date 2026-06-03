export const GROUPS = ['A', 'B', 'C', 'D', 'E'];

export const GROUP_NAMES = {
  A: 'Anamnesis interminable',
  B: 'Informes en jerga médica',
  C: 'Consultas urgentes a las 2am',
  D: 'Dudas de nutrición',
  E: 'Cálculo de dosis a mano',
};

export const CLINICAL_CRITERIA = [
  '¿La app resuelve un problema real que ocurre en clínicas de verdad?',
  '¿Un médico veterinario la usaría mañana sin modificaciones?',
  '¿Ahorra tiempo real de consulta o reduce errores concretos?',
  '¿La demo mostró un caso clínico real y convincente?',
  '¿Supieron justificar por qué su problema era prioritario?',
];

export const DESIGN_CRITERIA = [
  '¿La app tiene un flujo lógico entre sus widgets? ¿Se entiende cómo usarla?',
  '¿El prompt produce respuestas claras, consistentes y bien estructuradas?',
  '¿La app guía bien al usuario o lo deja perdido?',
  '¿Se nota que iteraron y mejoraron el prompt durante el taller?',
  '¿Los 2+ widgets se complementan o simplemente coexisten?',
];

export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

export function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status);
}

export function getPins(env) {
  return {
    A: env.GROUP_A_PIN,
    B: env.GROUP_B_PIN,
    C: env.GROUP_C_PIN,
    D: env.GROUP_D_PIN,
    E: env.GROUP_E_PIN,
  };
}

function bufferToHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSign(message, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return bufferToHex(signature);
}

export async function createToken(group, env) {
  const secret = env.TOKEN_SECRET || 'dev-secret-change-me';
  const expires = Date.now() + 2 * 60 * 60 * 1000;
  const payload = `${group}:${expires}`;
  const sig = await hmacSign(payload, secret);
  return btoa(`${payload}:${sig}`);
}

export async function verifyToken(token, env) {
  if (!token) return null;
  const secret = env.TOKEN_SECRET || 'dev-secret-change-me';

  try {
    const decoded = atob(token);
    const parts = decoded.split(':');
    if (parts.length !== 3) return null;

    const [group, expiresStr, sig] = parts;
    if (!GROUPS.includes(group)) return null;

    const expires = Number(expiresStr);
    if (!Number.isFinite(expires) || Date.now() > expires) return null;

    const expected = await hmacSign(`${group}:${expiresStr}`, secret);
    if (sig !== expected) return null;

    return group;
  } catch {
    return null;
  }
}

export function getAuthToken(request) {
  const header = request.headers.get('Authorization');
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

function sumArray(arr) {
  return arr.reduce((acc, value) => acc + (value ? 1 : 0), 0);
}

export function validateScores(voterGroup, scores) {
  if (!scores || typeof scores !== 'object') {
    return 'Formato de votos inválido';
  }

  for (const group of GROUPS) {
    if (group === voterGroup) {
      if (scores[group]) return 'No puedes votar por tu propio grupo';
      continue;
    }

    const entry = scores[group];
    if (!entry) return `Falta la evaluación del Grupo ${group}`;

    if (!Array.isArray(entry.clinical) || entry.clinical.length !== 5) {
      return `Criterios clínicos inválidos para Grupo ${group}`;
    }
    if (!Array.isArray(entry.design) || entry.design.length !== 5) {
      return `Criterios de diseño inválidos para Grupo ${group}`;
    }

    for (const value of [...entry.clinical, ...entry.design]) {
      if (value !== 0 && value !== 1) {
        return `Valores inválidos para Grupo ${group}`;
      }
    }
  }

  return null;
}

export function aggregateScores(rows) {
  const totals = {};
  for (const group of GROUPS) {
    totals[group] = { clinical: 0, design: 0, combined: 0 };
  }

  for (const row of rows) {
    const scores = JSON.parse(row.scores_json);
    for (const [group, entry] of Object.entries(scores)) {
      if (!totals[group]) continue;
      totals[group].clinical += sumArray(entry.clinical);
      totals[group].design += sumArray(entry.design);
    }
  }

  for (const group of GROUPS) {
    totals[group].combined = totals[group].clinical + totals[group].design;
  }

  return totals;
}

export function buildRanking(totals, field) {
  const sorted = GROUPS.map((group) => ({
    group,
    name: GROUP_NAMES[group],
    score: totals[group][field],
  })).sort((a, b) => b.score - a.score);

  const podium = [];
  let place = 1;

  for (let i = 0; i < sorted.length && place <= 3; i++) {
    const current = sorted[i];
    if (i > 0 && current.score < sorted[i - 1].score) {
      place = podium.length + 1;
    }
    if (place > 3) break;
    podium.push({ ...current, place });
  }

  return podium;
}
