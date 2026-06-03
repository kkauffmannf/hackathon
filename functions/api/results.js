import {
  GROUPS,
  GROUP_NAMES,
  aggregateScores,
  buildRanking,
  corsHeaders,
  jsonResponse,
} from '../lib/utils.js';

export async function onRequestGet(context) {
  const { env } = context;

  try {
    const { results: rows } = await env.DB.prepare(
      'SELECT voter_group, scores_json FROM votes ORDER BY created_at ASC'
    ).all();

    const votedGroups = rows.map((row) => row.voter_group);
    const pendingGroups = GROUPS.filter((group) => !votedGroups.includes(group));
    const totals = aggregateScores(rows);

    return jsonResponse({
      votedCount: votedGroups.length,
      totalGroups: GROUPS.length,
      pendingGroups,
      totals,
      rankings: {
        clinical: buildRanking(totals, 'clinical'),
        design: buildRanking(totals, 'design'),
        combined: buildRanking(totals, 'combined'),
      },
      groupNames: GROUP_NAMES,
    });
  } catch {
    return jsonResponse({ error: 'Error al cargar resultados' }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}
