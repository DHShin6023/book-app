'use strict';
const L = window.BookLogic;

// ===== 유틸 =====
function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function getSetting(key, def) {
  const v = localStorage.getItem('bookapp_' + key);
  return v === null ? def : v;
}
function setSetting(key, val) {
  localStorage.setItem('bookapp_' + key, val);
}

function showToast(msg, duration = 2200) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
}

document.querySelectorAll('.back-btn').forEach(btn => {
  btn.addEventListener('click', () => showView(btn.dataset.target));
});

// ===== 모델 목록 =====
const MODELS = [
  { id: 'openrouter/free', name: '자동 무료 모델 (기본)' },
  { id: 'google/gemma-4-31b-it:free', name: 'Gemma 4 31B (무료)' },
  { id: 'meta-llama/llama-4-scout:free', name: 'Llama 4 Scout (무료)' },
  { id: 'anthropic/claude-sonnet-4.6', name: 'Claude Sonnet 4.6 (유료·고품질)' }
];
const selectModel = document.getElementById('select-model');
MODELS.forEach(m => {
  const opt = document.createElement('option');
  opt.value = m.id;
  opt.textContent = m.name;
  selectModel.appendChild(opt);
});

// ===== 설정 화면 =====
document.getElementById('btn-settings-open').addEventListener('click', () => {
  document.getElementById('input-api-key').value = getSetting('api_key', '');
  selectModel.value = getSetting('model', MODELS[0].id);
  showView('settings');
});

document.getElementById('btn-save-settings').addEventListener('click', () => {
  setSetting('api_key', document.getElementById('input-api-key').value.trim());
  setSetting('model', selectModel.value);
  showToast('설정이 저장되었습니다.');
  showView('main');
});

// ===== 단어 칩 =====
let words = [];
const inputWord = document.getElementById('input-word');
const btnAddWord = document.getElementById('btn-add-word');
const btnRecommend = document.getElementById('btn-recommend');

function renderChips() {
  const box = document.getElementById('chips');
  box.innerHTML = words.map((w, i) =>
    `<span class="chip">${escapeHTML(w)}<button data-i="${i}" aria-label="삭제">✕</button></span>`
  ).join('');
  box.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      words.splice(Number(btn.dataset.i), 1);
      renderChips();
    });
  });
  document.getElementById('word-counter').textContent = `${words.length}/10`;
  btnRecommend.disabled = !L.canRecommend(words);
  const full = words.length >= 10;
  inputWord.disabled = full;
  btnAddWord.disabled = full;
  inputWord.placeholder = full ? '최대 10개까지 입력할 수 있어요' : '단어 입력 (예: 여행)';
}

function addWord() {
  const check = L.canAddWord(words, inputWord.value);
  if (!check.ok) {
    const msg = { empty: '단어를 입력해주세요.', duplicate: '이미 추가한 단어예요.', full: '최대 10개까지 입력할 수 있어요.' };
    showToast(msg[check.reason]);
    return;
  }
  words.push(check.word);
  inputWord.value = '';
  renderChips();
  inputWord.focus();
}

btnAddWord.addEventListener('click', addWord);
inputWord.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); addWord(); }
});

renderChips();
