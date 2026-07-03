const assert = require('assert');
const L = require('../logic.js');

// normalizeWord
assert.strictEqual(L.normalizeWord('  여행  '), '여행');
assert.strictEqual(L.normalizeWord(''), '');

// canAddWord
assert.deepStrictEqual(L.canAddWord([], ' 고독 '), { ok: true, word: '고독' });
assert.deepStrictEqual(L.canAddWord([], '   '), { ok: false, reason: 'empty' });
assert.deepStrictEqual(L.canAddWord(['여행'], '여행'), { ok: false, reason: 'duplicate' });
const ten = ['a','b','c','d','e','f','g','h','i','j'];
assert.deepStrictEqual(L.canAddWord(ten, '새단어'), { ok: false, reason: 'full' });

// canRecommend: 3~10개만 true
assert.strictEqual(L.canRecommend(['a','b']), false);
assert.strictEqual(L.canRecommend(['a','b','c']), true);
assert.strictEqual(L.canRecommend(ten), true);

// extractJSON: 마크다운 펜스/잡담 섞인 응답에서 배열 추출
const messy = '추천 결과입니다!\n```json\n[{"title":"데미안","author":"헤르만 헤세"}]\n```\n감사합니다';
assert.deepStrictEqual(L.extractJSON(messy), [{ title: '데미안', author: '헤르만 헤세' }]);
assert.throws(() => L.extractJSON('죄송합니다, 추천할 수 없습니다.'));
assert.throws(() => L.extractJSON('[깨진 json'));

// validateBooks: title/author 필수, 최대 5개, 필드 정규화
const books = L.validateBooks([
  { title: ' 데미안 ', author: '헤르만 헤세', original_title: 'Demian', reason: '이유', summary: '요약' },
  { title: '', author: '무명' },          // title 없음 → 제거
  { author: '저자만' },                    // title 없음 → 제거
  { title: '한국책', author: '김작가' },   // 선택 필드 없음 → 빈 문자열
  { title: 'b3', author: 'a3' }, { title: 'b4', author: 'a4' },
  { title: 'b5', author: 'a5' }, { title: 'b6', author: 'a6' }
]);
assert.strictEqual(books.length, 5); // 유효 6개 중 5개로 잘림
assert.deepStrictEqual(books[0], { title: '데미안', author: '헤르만 헤세', originalTitle: 'Demian', reason: '이유', summary: '요약' });
assert.deepStrictEqual(books[1], { title: '한국책', author: '김작가', originalTitle: '', reason: '', summary: '' });
assert.deepStrictEqual(L.validateBooks('배열아님'), []);

// pickOpenLibraryCover: 검색 응답에서 첫 cover_i로 표지 URL 생성, 없으면 null
assert.strictEqual(
  L.pickOpenLibraryCover({ docs: [{ title: 'no cover' }, { title: 'Rich Dad', cover_i: 8315603 }] }),
  'https://covers.openlibrary.org/b/id/8315603-M.jpg'
);
assert.strictEqual(L.pickOpenLibraryCover({ docs: [{ title: 'no cover' }] }), null);
assert.strictEqual(L.pickOpenLibraryCover({}), null);
assert.strictEqual(L.pickOpenLibraryCover(null), null);

// buildShareText: 단어+추천 도서 목록을 공유용 텍스트로 변환
const shareText = L.buildShareText(
  ['여행', '고독'],
  [
    { title: '데미안', author: '헤르만 헤세', originalTitle: 'Demian', reason: '이유', summary: '요약' },
    { title: '한국책', author: '김작가', originalTitle: '', reason: '', summary: '' }
  ],
  'https://dhshin6023.github.io/book-app/'
);
assert.ok(shareText.includes('북 큐레이션'));
assert.ok(shareText.includes('여행, 고독'));
assert.ok(shareText.includes('1. 데미안 — 헤르만 헤세'));
assert.ok(shareText.includes('2. 한국책 — 김작가'));
assert.ok(shareText.includes('이유\n\n2. 한국책'), '책 사이에 빈 줄 필요');
assert.ok(shareText.includes('김작가\n\n👉'), '마지막 책과 링크 사이에 빈 줄 필요');
assert.ok(shareText.includes('https://dhshin6023.github.io/book-app/'));
assert.strictEqual(L.buildShareText([], [], 'url').includes('undefined'), false);

console.log('✅ 모든 로직 테스트 통과');
