import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LANGUAGES, DEFAULT_LANG, isLangCode } from '../src/i18n/languages.ts';
import { ROWS } from '../src/i18n/strings.ts';
import { translate, translateChildren } from '../src/i18n/translate.ts';

const placeholders = (s: string) => (s.match(/\{\d\}/g) ?? []).sort().join(',');

test('English is the default language and every language code is unique', () => {
  assert.equal(DEFAULT_LANG, 'en');
  assert.equal(LANGUAGES[0].code, 'en');
  assert.equal(new Set(LANGUAGES.map((l) => l.code)).size, LANGUAGES.length);
  assert.ok(isLangCode('he') && !isLangCode('xx'));
});

test('every translation row has one entry per language and the same placeholders', () => {
  const keys = new Set<string>();
  for (const row of ROWS) {
    assert.equal(row.length, LANGUAGES.length, `wrong column count: ${row[0]}`);
    assert.ok(!keys.has(row[0]), `duplicate key: ${row[0]}`);
    keys.add(row[0]);
    row.forEach((cell, i) => {
      assert.ok(cell.trim().length > 0, `empty ${LANGUAGES[i].code}: ${row[0]}`);
      assert.equal(placeholders(cell), placeholders(row[0]), `placeholders differ in ${LANGUAGES[i].code}: ${row[0]}`);
    });
  }
});

test('translate: exact, decorated, pattern and fallback', () => {
  assert.equal(translate('Log in', 'en'), 'Log in');
  assert.equal(translate('Log in', 'es'), 'Iniciar sesión');
  assert.equal(translate('🩺 You are a doctor!', 'fr'), '🩺 Tu es un médecin !');
  assert.equal(translate('Level 7', 'de'), 'Level 7');
  assert.equal(translate('Level 7', 'ru'), 'Уровень 7');
  assert.equal(translate('Bots: 3', 'ja'), 'ボット: 3');
  assert.equal(translate('Something not in the table', 'ja'), 'Something not in the table');
});

test('translateChildren joins mixed string and number children', () => {
  assert.equal(translateChildren(['Level ', 4], 'es'), 'Nivel 4');
  assert.deepEqual(translateChildren(['Hello ', 4], 'es'), ['Hello ', 4]);
  assert.equal(translateChildren('Shop', 'it'), 'Negozio');
});

test('right-to-left languages mirror rows, alignment and side spacing', async () => {
  const { isRtl, mirrorStyle } = await import('../src/i18n/direction.ts');
  assert.ok(isRtl('he') && isRtl('ar') && !isRtl('en') && !isRtl('ja'));
  assert.deepEqual(mirrorStyle({ flexDirection: 'row', marginLeft: 4, textAlign: 'left' }), { flexDirection: 'row-reverse', marginRight: 4, textAlign: 'right' });
  assert.deepEqual(mirrorStyle({ flexDirection: 'row-reverse', paddingRight: 2 }), { flexDirection: 'row', paddingLeft: 2 });
  assert.deepEqual(mirrorStyle(undefined, true), { textAlign: 'right' });
});
