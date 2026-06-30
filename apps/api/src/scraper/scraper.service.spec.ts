import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanDisplayText, extractJpCenterMileage, selectRowsWithMileage } from './scraper.service';

test('extracts mileage from a JP Center desktop lot row', () => {
  const html = `
    <td class="t_header">Mileage<br>Condition</td>
    <td><center><div><nobr>2000 km</nobr><br><b>S</b></div></center></td>
  `;

  assert.equal(extractJpCenterMileage(html), 2000);
});

test('normalizes formatted JP Center mileage', () => {
  assert.equal(extractJpCenterMileage('<nobr>123,000 km</nobr>'), 123000);
  assert.equal(extractJpCenterMileage('<nobr>45 000 км</nobr>'), 45000);
  assert.equal(extractJpCenterMileage('<nobr>0 km</nobr>'), 0);
});

test('returns undefined when a detail page has no mileage', () => {
  assert.equal(extractJpCenterMileage('<nobr>- km</nobr>'), undefined);
});

test('selects only JP Center rows with a known positive mileage', () => {
  const rows = [{ q: '0' }, { q: '2000' }, { q: '' }, { q: '8,000' }, { q: '12000' }];

  assert.deepEqual(selectRowsWithMileage(rows, 2), [{ q: '2000' }, { q: '8,000' }]);
});

test('removes invalid encoded and Japanese title suffixes', () => {
  assert.equal(
    cleanDisplayText('G Dark &#65400; Low &#65425;&#65421;&#65438;&#65437;&#65409;&#65388;'),
    'G Dark',
  );
  assert.equal(cleanDisplayText('Hybrid ZX カスタム Package'), 'Hybrid ZX');
});
