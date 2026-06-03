import {
  corsHeaders,
  errorResponse,
  getAuthToken,
  jsonResponse,
  validateScores,
  verifyToken,
} from '../lib/utils.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const voterGroup = await verifyToken(getAuthToken(request), env);
    if (!voterGroup) {
      return errorResponse('Sesión inválida o expirada. Vuelve a ingresar tu PIN.', 401);
    }

    const body = await request.json();
    const validationError = validateScores(voterGroup, body.scores);
    if (validationError) {
      return errorResponse(validationError, 400);
    }

    const existing = await env.DB.prepare(
      'SELECT voter_group FROM votes WHERE voter_group = ?'
    ).bind(voterGroup).first();

    if (existing) {
      return errorResponse('Este grupo ya envió su votación', 409);
    }

    await env.DB.prepare(
      'INSERT INTO votes (voter_group, scores_json) VALUES (?, ?)'
    ).bind(voterGroup, JSON.stringify(body.scores)).run();

    return jsonResponse({ ok: true, message: 'Voto registrado correctamente' });
  } catch {
    return errorResponse('Error al guardar el voto', 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}
