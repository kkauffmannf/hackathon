import {
  GROUP_NAMES,
  corsHeaders,
  createToken,
  errorResponse,
  getPins,
  jsonResponse,
} from '../lib/utils.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const pin = String(body.pin || '').trim();

    if (!pin) {
      return errorResponse('Ingresa el PIN de tu grupo', 400);
    }

    const pins = getPins(env);
    const group = Object.entries(pins).find(([, value]) => value && value === pin)?.[0];

    if (!group) {
      return errorResponse('PIN incorrecto', 401);
    }

    const existing = await env.DB.prepare(
      'SELECT voter_group FROM votes WHERE voter_group = ?'
    ).bind(group).first();

    if (existing) {
      return errorResponse('Este grupo ya envió su votación', 409);
    }

    const token = await createToken(group, env);

    return jsonResponse({
      group,
      groupName: GROUP_NAMES[group],
      token,
    });
  } catch {
    return errorResponse('Error al validar PIN', 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}
