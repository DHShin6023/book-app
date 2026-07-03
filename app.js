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

// ===== AI 추천 =====
function buildPrompt(wordList) {
  return `당신은 도서 추천 전문가입니다.
사용자가 마음에 드는 단어들: ${wordList.join(', ')}

이 단어들이 담고 있는 정서와 주제에 어울리는, 실제로 출간된 도서를 4~5권 추천하세요(최소 3권).
한국 도서와 해외 도서(한국어 번역서 포함)를 모두 추천할 수 있습니다.
반드시 실존하는 책만 추천하고, 확실하지 않은 책은 제외하세요.

아래 JSON 배열 형식으로만 응답하세요. JSON 외의 텍스트는 절대 쓰지 마세요.
[
  {
    "title": "한국어판 제목(번역서면 번역 제목)",
    "author": "저자 이름",
    "original_title": "해외 도서의 원제 (한국 도서면 빈 문자열)",
    "reason": "입력 단어들과 이 책이 어떻게 연결되는지 2~3문장 (단어를 직접 언급)",
    "summary": "책 내용 요약 2~3문장"
  }
]`;
}

async function callOpenRouter(apiKey, model, prompt) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': location.href,
      'X-Title': 'Book Recommend App'
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000
    })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const error = new Error(err.error?.message || `API 오류 (${response.status})`);
    error.status = response.status;
    throw error;
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// Google Books에서 표지 URL 조회 (실패 시 null)
async function fetchCover(book) {
  const queries = [
    `intitle:${book.title} inauthor:${book.author}`,
    book.title,
    book.originalTitle
  ].filter(Boolean);
  for (const q of queries) {
    try {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=5`);
      if (!res.ok) continue;
      const data = await res.json();
      const item = (data.items || []).find(it => it.volumeInfo?.imageLinks?.thumbnail);
      if (item) return item.volumeInfo.imageLinks.thumbnail.replace(/^http:/, 'https:');
    } catch (e) { /* 다음 쿼리 시도 */ }
  }
  return null;
}

function renderResults(books, covers) {
  const box = document.getElementById('results');
  box.innerHTML = books.map((b, i) => {
    const cover = covers[i]
      ? `<img src="${escapeHTML(covers[i])}" alt="${escapeHTML(b.title)} 표지">`
      : `<div class="cover-placeholder">${escapeHTML(b.title)}</div>`;
    const badge = covers[i] ? '' : '<span class="no-cover-badge">표지 정보 없음</span>';
    return `<div class="book-card">
      <div class="book-cover">${cover}</div>
      <div class="book-info">
        <h3>${escapeHTML(b.title)}</h3>
        <p class="book-author">${escapeHTML(b.author)}${b.originalTitle ? ' · ' + escapeHTML(b.originalTitle) : ''}</p>
        ${badge}
        <p class="book-reason"><strong>추천 이유</strong> ${escapeHTML(b.reason)}</p>
        <p class="book-summary">${escapeHTML(b.summary)}</p>
      </div>
    </div>`;
  }).join('');
}

function showError(msg) {
  const box = document.getElementById('error-box');
  box.textContent = msg;
  box.classList.remove('hidden');
}

async function recommend() {
  const apiKey = getSetting('api_key', '');
  if (!apiKey) {
    showToast('먼저 설정에서 API 키를 입력해주세요.');
    showView('settings');
    return;
  }
  const model = getSetting('model', MODELS[0].id);
  const prompt = buildPrompt(words);

  btnRecommend.disabled = true;
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('error-box').classList.add('hidden');
  document.getElementById('results').innerHTML = '';

  try {
    let books = null;
    // JSON 파싱 실패 시 1회 자동 재시도
    for (let attempt = 0; attempt < 2 && !books; attempt++) {
      const content = await callOpenRouter(apiKey, model, prompt);
      try {
        const parsed = L.extractJSON(content);
        const valid = L.validateBooks(parsed);
        if (valid.length > 0) books = valid;
      } catch (e) { /* 재시도 */ }
    }
    if (!books) {
      showError('AI 응답을 해석하지 못했습니다. 잠시 후 다시 시도하거나 설정에서 다른 모델을 선택해보세요.');
      return;
    }
    const covers = await Promise.all(books.map(fetchCover));
    renderResults(books, covers);
  } catch (e) {
    if (e.status === 401) showError('API 키가 올바르지 않습니다. 설정에서 키를 확인해주세요.');
    else if (e.status === 402) showError('OpenRouter 크레딧이 부족합니다. 무료 모델을 선택하거나 크레딧을 충전해주세요.');
    else if (e.status === 429) showError('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
    else showError(`오류가 발생했습니다: ${e.message}`);
  } finally {
    document.getElementById('loading').classList.add('hidden');
    btnRecommend.disabled = !L.canRecommend(words);
  }
}

btnRecommend.addEventListener('click', recommend);
