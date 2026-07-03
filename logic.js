(function (root) {
  'use strict';

  function normalizeWord(raw) {
    return (raw || '').trim();
  }

  function canAddWord(words, raw) {
    const w = normalizeWord(raw);
    if (!w) return { ok: false, reason: 'empty' };
    if (words.includes(w)) return { ok: false, reason: 'duplicate' };
    if (words.length >= 10) return { ok: false, reason: 'full' };
    return { ok: true, word: w };
  }

  function canRecommend(words) {
    return words.length >= 3 && words.length <= 10;
  }

  function extractJSON(text) {
    if (typeof text !== 'string') throw new Error('응답이 비어 있습니다');
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start === -1 || end <= start) throw new Error('응답에서 JSON을 찾지 못했습니다');
    return JSON.parse(text.slice(start, end + 1));
  }

  function validateBooks(data) {
    if (!Array.isArray(data)) return [];
    return data
      .filter(b => b && typeof b.title === 'string' && b.title.trim()
                     && typeof b.author === 'string' && b.author.trim())
      .map(b => ({
        title: b.title.trim(),
        author: b.author.trim(),
        originalTitle: typeof b.original_title === 'string' ? b.original_title.trim() : '',
        reason: typeof b.reason === 'string' ? b.reason.trim() : '',
        summary: typeof b.summary === 'string' ? b.summary.trim() : ''
      }))
      .slice(0, 5);
  }

  function pickOpenLibraryCover(data) {
    const doc = (data && Array.isArray(data.docs) ? data.docs : []).find(d => d && d.cover_i);
    return doc ? 'https://covers.openlibrary.org/b/id/' + doc.cover_i + '-M.jpg' : null;
  }

  function buildShareText(words, books, appUrl) {
    const lines = ['📚 북 큐레이션 - AI 도서 추천', ''];
    if (words.length) lines.push('내가 고른 단어: ' + words.join(', '), '');
    books.forEach((b, i) => {
      lines.push((i + 1) + '. ' + b.title + ' — ' + b.author);
      if (b.reason) lines.push('   ' + b.reason);
    });
    lines.push('', '👉 ' + appUrl);
    return lines.join('\n');
  }

  const api = { normalizeWord, canAddWord, canRecommend, extractJSON, validateBooks, pickOpenLibraryCover, buildShareText };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.BookLogic = api;
  }
})(this);
