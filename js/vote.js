const GROUPS = ['1', '2', '3', '4', '5'];

const GROUP_NAMES = {
  '1': 'El informe funcional consume la sesión',
  '2': '¿Qué actividad terapéutica elijo?',
  '3': 'La familia no sabe qué hacer en casa',
  '4': 'El plan terapéutico no lo entiende nadie',
  '5': 'La derivación llega vacía',
};

const CLINICAL_CRITERIA = [
  '¿La app resuelve un problema que ocurre de verdad en la práctica clínica en Chile?',
  '¿Un TO la usaría mañana en su CESFAM u hospital sin modificaciones?',
  '¿Ahorra tiempo real de sesión o mejora la calidad de la intervención?',
  '¿La demo mostró un caso clínico convincente y realista?',
  '¿Supieron justificar por qué su problema era prioritario?',
];

const DESIGN_CRITERIA = [
  '¿La app tiene un flujo lógico entre sus widgets? ¿Se entiende cómo usarla?',
  '¿El prompt produce respuestas claras, consistentes y bien estructuradas?',
  '¿La app guía bien al usuario o lo deja perdido?',
  '¿Se nota que iteraron y mejoraron el prompt durante el taller?',
  '¿Los 2+ widgets se complementan o simplemente coexisten?',
];

const STORAGE_KEY = 'hackathon_vote_session';

let session = null;

function show(el) {
  el.classList.remove('hidden');
}

function hide(el) {
  el.classList.add('hidden');
}

function showAlert(container, message, type = 'error') {
  container.textContent = message;
  container.className = `alert alert-${type}`;
  show(container);
}

function hideAlert(container) {
  hide(container);
  container.textContent = '';
}

async function apiPost(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(path, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Error de conexión');
  }
  return data;
}

function saveSession(data) {
  session = data;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearSession() {
  session = null;
  localStorage.removeItem(STORAGE_KEY);
}

function buildCriterion(category, group, index, text, color) {
  const id = `${category}-${group}-${index}`;
  const label = document.createElement('label');
  label.className = 'rubric-criterion';
  label.innerHTML = `
    <input type="checkbox" id="${id}" data-group="${group}" data-category="${category}" data-index="${index}">
    <span>${text}</span>
  `;
  label.style.setProperty('--accent', color);
  return label;
}

function buildGroupSection(voterGroup, targetGroup) {
  const section = document.createElement('section');
  section.className = 'group-section card';
  section.innerHTML = `
    <div class="group-header">
      <div class="group-badge">${targetGroup}</div>
      <div>
        <div class="group-title">Grupo ${targetGroup}</div>
        <div class="group-subtitle">${GROUP_NAMES[targetGroup]}</div>
      </div>
    </div>
    <div class="rubric-grid">
      <div class="rubric-card">
        <div class="rubric-card-header" style="background:#0E8A7D;">
          <div class="award-icon">🥇</div>
          <div class="award-title">Más útil clínicamente</div>
        </div>
        <div class="rubric-card-body clinical-body"></div>
      </div>
      <div class="rubric-card">
        <div class="rubric-card-header" style="background:#17C3B2;">
          <div class="award-icon">🎨</div>
          <div class="award-title">Mejor diseñada / mejor prompt</div>
        </div>
        <div class="rubric-card-body design-body"></div>
      </div>
    </div>
  `;

  const clinicalBody = section.querySelector('.clinical-body');
  const designBody = section.querySelector('.design-body');

  CLINICAL_CRITERIA.forEach((text, index) => {
    clinicalBody.appendChild(buildCriterion('clinical', targetGroup, index, text, '#0E8A7D'));
  });

  DESIGN_CRITERIA.forEach((text, index) => {
    designBody.appendChild(buildCriterion('design', targetGroup, index, text, '#17C3B2'));
  });

  return section;
}

function renderVoteForm(voterGroup) {
  const container = document.getElementById('vote-form-container');
  container.innerHTML = '';

  GROUPS.filter((group) => group !== voterGroup).forEach((group) => {
    container.appendChild(buildGroupSection(voterGroup, group));
  });
}

function collectScores() {
  const scores = {};
  const checkboxes = document.querySelectorAll('#vote-form-container input[type="checkbox"]');

  checkboxes.forEach((checkbox) => {
    const group = checkbox.dataset.group;
    const category = checkbox.dataset.category;
    const index = Number(checkbox.dataset.index);

    if (!scores[group]) {
      scores[group] = { clinical: [0, 0, 0, 0, 0], design: [0, 0, 0, 0, 0] };
    }

    scores[group][category][index] = checkbox.checked ? 1 : 0;
  });

  return scores;
}

function showVoteScreen(data) {
  hide(document.getElementById('pin-screen'));
  show(document.getElementById('vote-screen'));
  show(document.getElementById('session-badge'));
  document.getElementById('session-badge').textContent =
    `Votando como Grupo ${data.group} — ${data.groupName}`;
  renderVoteForm(data.group);
}

function showDoneScreen() {
  hide(document.getElementById('vote-screen'));
  show(document.getElementById('done-screen'));
}

async function handlePinSubmit(event) {
  event.preventDefault();
  const pinInput = document.getElementById('pin-input');
  const alert = document.getElementById('pin-alert');
  hideAlert(alert);

  try {
    const data = await apiPost('/api/auth', { pin: pinInput.value.trim() });
    saveSession(data);
    showVoteScreen(data);
  } catch (error) {
    showAlert(alert, error.message);
  }
}

async function handleVoteSubmit(event) {
  event.preventDefault();
  const alert = document.getElementById('vote-alert');
  const submitBtn = document.getElementById('submit-vote-btn');
  hideAlert(alert);

  if (!session?.token) {
    showAlert(alert, 'Sesión expirada. Vuelve a ingresar tu PIN.');
    return;
  }

  submitBtn.disabled = true;

  try {
    await apiPost('/api/vote', { scores: collectScores() }, session.token);
    clearSession();
    showDoneScreen();
  } catch (error) {
    showAlert(alert, error.message);
    submitBtn.disabled = false;
  }
}

function init() {
  document.getElementById('pin-form').addEventListener('submit', handlePinSubmit);
  document.getElementById('vote-form').addEventListener('submit', handleVoteSubmit);

  const saved = loadSession();
  if (saved?.group && saved?.token) {
    session = saved;
    showVoteScreen(saved);
  }
}

document.addEventListener('DOMContentLoaded', init);
