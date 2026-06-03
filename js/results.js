const PLACE_LABELS = { 1: '1°', 2: '2°', 3: '3°' };
const PLACE_CLASSES = { 1: 'first', 2: 'second', 3: 'third' };
const PLACE_ORDER = [2, 1, 3];

const TITLES = {
  clinical: '🥇 Más útil clínicamente',
  design: '🎨 Mejor diseñada / mejor prompt',
  combined: '🏆 Ranking general',
};

let refreshTimer = null;

function formatScore(score) {
  return `${score} pt${score === 1 ? '' : 's'}`;
}

function renderPodiumBlock(entry) {
  if (!entry) {
    return `<div class="podium-place"><div class="podium-block third" style="opacity:0.3;min-height:80px"><span>—</span></div></div>`;
  }

  return `
    <div class="podium-place">
      ${entry.place === 1 ? '<div class="podium-trophy">🏆</div>' : ''}
      <div class="podium-block ${PLACE_CLASSES[entry.place]}">
        <div class="podium-rank">${PLACE_LABELS[entry.place]}</div>
        <div class="podium-group">${entry.group}</div>
        <div class="podium-score">${formatScore(entry.score)}</div>
        <div class="podium-name">${entry.name}</div>
      </div>
    </div>
  `;
}

function renderPodiumSection(category, ranking) {
  const byPlace = {};
  ranking.forEach((entry) => {
    if (!byPlace[entry.place]) byPlace[entry.place] = [];
    byPlace[entry.place].push(entry);
  });

  const stage = PLACE_ORDER.map((place) => {
    const entries = byPlace[place] || [];
    if (entries.length === 0) return renderPodiumBlock(null);
    if (entries.length === 1) return renderPodiumBlock(entries[0]);

    const combined = entries.map((e) => `${e.group} (${e.score})`).join(' / ');
    return renderPodiumBlock({
      place,
      group: combined,
      name: entries.map((e) => e.name).join(' · '),
      score: entries[0].score,
    });
  }).join('');

  return `
    <div class="podium-section">
      <div class="podium-title">${TITLES[category]}</div>
      <div class="podium-stage">${stage}</div>
    </div>
  `;
}

function renderScoresTable(totals, groupNames) {
  const groups = Object.keys(totals).sort();
  const rows = groups.map((group) => `
    <tr>
      <td><strong>${group}</strong></td>
      <td>${groupNames[group] || ''}</td>
      <td>${totals[group].clinical}</td>
      <td>${totals[group].design}</td>
      <td><strong>${totals[group].combined}</strong></td>
    </tr>
  `).join('');

  return `
    <table class="scores-table">
      <thead>
        <tr>
          <th>Grupo</th>
          <th>Proyecto</th>
          <th>Clínico</th>
          <th>Diseño</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function updateStatusBar(data) {
  const bar = document.getElementById('status-bar');
  const pending = data.pendingGroups.length
    ? `Faltan por votar: ${data.pendingGroups.join(', ')}`
    : 'Todos los grupos han votado';
  bar.textContent = `${data.votedCount}/${data.totalGroups} votos recibidos · ${pending}`;
}

async function fetchResults() {
  const response = await fetch('/api/results');
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Error al cargar resultados');
  return data;
}

async function refreshResults() {
  try {
    const data = await fetchResults();
    updateStatusBar(data);

    const grid = document.getElementById('podium-grid');
    grid.innerHTML = [
      renderPodiumSection('clinical', data.rankings.clinical),
      renderPodiumSection('design', data.rankings.design),
      renderPodiumSection('combined', data.rankings.combined),
    ].join('');

    document.getElementById('scores-table-container').innerHTML =
      renderScoresTable(data.totals, data.groupNames);
  } catch (error) {
    document.getElementById('status-bar').textContent = error.message;
  }
}

async function handleAdminAction(action) {
  const adminPin = document.getElementById('admin-pin').value.trim();
  const alert = document.getElementById('admin-alert');

  if (!adminPin) {
    alert.textContent = 'Ingresa el PIN de administrador';
    alert.className = 'alert alert-error';
    alert.classList.remove('hidden');
    return;
  }

  try {
    const response = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminPin, action }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    alert.textContent = data.message || `Votados: ${data.votedGroups?.join(', ') || 'ninguno'}. Pendientes: ${data.pendingGroups?.join(', ') || 'ninguno'}`;
    alert.className = 'alert alert-success';
    alert.classList.remove('hidden');

    if (action === 'reset') await refreshResults();
  } catch (error) {
    alert.textContent = error.message;
    alert.className = 'alert alert-error';
    alert.classList.remove('hidden');
  }
}

function init() {
  refreshResults();
  refreshTimer = setInterval(refreshResults, 5000);

  document.getElementById('refresh-btn').addEventListener('click', refreshResults);
  document.getElementById('admin-status-btn').addEventListener('click', () => handleAdminAction('status'));
  document.getElementById('admin-reset-btn').addEventListener('click', () => {
    if (window.confirm('¿Eliminar todos los votos? Esta acción no se puede deshacer.')) {
      handleAdminAction('reset');
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
