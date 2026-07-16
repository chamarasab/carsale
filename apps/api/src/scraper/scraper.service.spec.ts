import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeAuctionGrade } from '../cars/auction-grades';
import { normalizeAuctionDate } from '../cars/cars.service';
import {
  cleanDisplayText,
  extractAutomarketImageUrls,
  extractJpCenterMileage,
  normalizeEngineCapacity,
  parseAutomarketRows,
  selectRowsWithMileage,
  selectCurrentAuctionRows,
} from './scraper.service';

test('extracts mileage from a JP Center desktop lot row', () => {
  const html = `
    <td class="t_header">Mileage<br>Condition</td>
    <td><center><div><nobr>2000 km</nobr><br><b>S</b></div></center></td>
  `;

  assert.equal(extractJpCenterMileage(html), 2000);
});

test('normalizes supported auction dates for expiry cleanup', () => {
  assert.equal(normalizeAuctionDate('2026-07-15'), '2026-07-15');
  assert.equal(normalizeAuctionDate('15.07.2026'), '2026-07-15');
  assert.equal(normalizeAuctionDate('15/07/2026'), '2026-07-15');
  assert.equal(normalizeAuctionDate('31.02.2026'), undefined);
});

test('accepts only supported auction condition grades', () => {
  assert.equal(normalizeAuctionGrade('4.0'), '4');
  assert.equal(normalizeAuctionGrade('ra'), 'RA');
  assert.equal(normalizeAuctionGrade('Premium G HEV'), undefined);
  assert.equal(normalizeAuctionGrade('A'), undefined);
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

test('selects only current or future JP Center auctions', () => {
  const rows = [
    { q: '10,000', e: '14.07.2026' },
    { q: '20,000', e: '15.07.2026' },
    { q: '30,000', e: '2026-07-16' },
    { q: '40,000', e: '' },
  ];
  assert.deepEqual(selectCurrentAuctionRows(rows, 10, '2026-07-15'), [rows[1], rows[2]]);
});

test('removes invalid encoded and Japanese title suffixes', () => {
  assert.equal(
    cleanDisplayText('G Dark &#65400; Low &#65425;&#65421;&#65438;&#65437;&#65409;&#65388;'),
    'G Dark',
  );
  assert.equal(cleanDisplayText('Hybrid ZX カスタム Package'), 'Hybrid ZX');
});

test('parses Automarket vehicle trim and auction score separately', () => {
  const html = `
    <div id="currencyLot1">JPY</div><div id="priceLotS1">750</div>
    <table><tr id="cell_1">
      <td id="date_1">2026-07-02 00:00:00</td>
      <td id="bid_number_1"><a href="/auctions/?p=project/lot&id=976641290&s"><b>73004</b></a></td>
      <td id="auction_1">TAA Chubu</td>
      <td id="photo_1"><img load_src="https://i.aleado.ru/image/auto/example/1.jpg?w=72"></td>
      <td id="company_1">TOYOTA</td><td id="model_1">ROOMY</td><td id="grade_1">X</td>
      <td id="year_1">2026</td><td id="mileage_1">8 000</td><td id="displacement_1">1000cc</td>
      <td id="transmission_1">IAT</td><td id="color_1">BLACK</td><td id="model_type_1">M900A</td>
      <td id="equipment_1">AC</td>
      <td id="scores_1">4.5</td>
    </tr></table>`;

  assert.deepEqual(parseAutomarketRows(html), [{
    id: '976641290',
    lotNumber: '73004',
    auctionDate: '2026-07-02',
    auctionName: 'TAA Chubu',
    maker: 'TOYOTA',
    model: 'ROOMY',
    vehicleGrade: 'X',
    auctionGrade: '4.5',
    year: 2026,
    mileageKm: 8000,
    engineCapacity: 1000,
    transmission: 'IAT',
    color: 'BLACK',
    modelCode: 'M900A',
    equipment: 'AC',
    auctionPriceJpy: 750000,
    detailPath: '/auctions/?p=project/lot&id=976641290&s',
    previewImageUrl: 'https://i.aleado.ru/image/auto/example/1.jpg',
  }]);
});

test('extracts Automarket detail images and normalizes known rounded capacities', () => {
  assert.deepEqual(
    extractAutomarketImageUrls(
      '<a href="https://i.aleado.ru/pic/?system=auto&amp;number=0"></a><a href="https://i.aleado.ru/pic/?system=auto&amp;number=1"></a>',
    ),
    [
      'https://i.aleado.ru/pic/?system=auto&number=0',
      'https://i.aleado.ru/pic/?system=auto&number=1',
    ],
  );
  assert.equal(normalizeEngineCapacity(1000, 'M900A'), 996);
  assert.equal(normalizeEngineCapacity(1200, 'A202A'), 1196);
});
