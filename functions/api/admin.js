import { GROUPS, corsHeaders, errorResponse, incrementVotingEpoch, jsonResponse } from '../lib/utils.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const adminPin = String(body.adminPin || '').trim();
    const action = body.action;

    if (!env.ADMIN_PIN || adminPin !== env.ADMIN_PIN) {
      return errorResponse('PIN de administrador incorrecto', 401);
    }

    if (action === 'reset') {
      await env.DB.prepare('DELETE FROM votes').run();
      await incrementVotingEpoch(env);
      return jsonResponse({ ok: true, message: 'Todos los votos fueron eliminados. Las sesiones abiertas quedaron invalidadas.' });
    }

    if (action === 'status') {
      const { results: rows } = await env.DB.prepare(
        'SELECT voter_group FROM votes'
      ).all();
      const votedGroups = rows.map((row) => row.voter_group);
      const pendingGroups = GROUPS.filter((group) => !votedGroups.includes(group));

      return jsonResponse({
        votedGroups,
        pendingGroups,
        votedCount: votedGroups.length,
        totalGroups: GROUPS.length,
      });
    }

    return errorResponse('Acción no reconocida', 400);
  } catch {
    return errorResponse('Error de administración', 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}
