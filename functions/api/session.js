import {
  GROUP_NAMES,
  corsHeaders,
  errorResponse,
  getAuthToken,
  jsonResponse,
  verifyToken,
} from '../lib/utils.js';

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const group = await verifyToken(getAuthToken(request), env);
    if (!group) {
      return errorResponse('Sesión inválida o expirada. Vuelve a ingresar tu PIN.', 401);
    }

    const existing = await env.DB.prepare(
      'SELECT voter_group FROM votes WHERE voter_group = ?'
    ).bind(group).first();

    if (existing) {
      return errorResponse('Este grupo ya envió su votación', 409);
    }

    return jsonResponse({
      group,
      groupName: GROUP_NAMES[group],
    });
  } catch {
    return errorResponse('Error al validar sesión', 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}
