import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeAuctionGrade } from '../cars/auction-grades';
import { findDuplicateScrapedAuctions, normalizeAuctionDate } from '../cars/cars.service';
import {
  cleanDisplayText,
  DEFAULT_AUTOMARKET_JOBS,
  extractAutomarketAveragePriceArgs,
  extractAutomarketAveragePriceJpy,
  extractAutomarketImageUrls,
  extractJpCenterMileage,
  isApprovedAuctionImageUrl,
  isApprovedAutomarketUrl,
  isAutomarketAuctionSheetUrl,
  normalizeEngineCapacity,
  parseAutomarketBatchJobs,
  parseAutomarketRows,
  selectEligibleAutomarketRows,
  selectRowsWithMileage,
  selectCurrentAuctionRows,
} from './scraper.service';

test('uses A-Automarket searches for the scheduled batch', () => {
  assert.equal(DEFAULT_AUTOMARKET_JOBS.length, 17);
  assert.ok(DEFAULT_AUTOMARKET_JOBS.every((job) => job.yearFrom === 2023));
  assert.ok(DEFAULT_AUTOMARKET_JOBS.every((job) => (job.listSize ?? 0) >= 1 && (job.listSize ?? 0) <= 10));
  assert.ok(DEFAULT_AUTOMARKET_JOBS.some((job) => job.maker === 'Mercedes Benz' && job.model === ''));
  assert.ok(DEFAULT_AUTOMARKET_JOBS.some((job) => job.maker === 'Land Rover' && job.model === ''));
});

test('normalizes configured A-Automarket batch searches', () => {
  const jobs = parseAutomarketBatchJobs(JSON.stringify([
    {
      maker: 'Toyota',
      model: 'Roomy',
      yearFrom: 2024,
      pages: 3,
      listSize: 50,
      auctionGrade: '4.0',
    },
    {
      maker: 'Daihatsu',
      model: 'Thor',
      allUpcoming: true,
    },
    {
      maker: 'All makers',
      model: '',
      allUpcoming: true,
    },
  ]));

  assert.deepEqual(jobs, [
    {
      maker: 'Toyota',
      model: 'Roomy',
      auctionGrade: '4',
      yearFrom: 2024,
      yearTo: undefined,
      listSize: 10,
      allUpcoming: false,
    },
    {
      maker: 'Daihatsu',
      model: 'Thor',
      auctionGrade: undefined,
      yearFrom: undefined,
      yearTo: undefined,
      listSize: undefined,
      allUpcoming: true,
    },
    {
      maker: 'All makers',
      model: '',
      auctionGrade: undefined,
      yearFrom: undefined,
      yearTo: undefined,
      listSize: undefined,
      allUpcoming: true,
    },
  ]);
  assert.throws(
    () => parseAutomarketBatchJobs('[{"maker":"Unknown","model":"Example"}]'),
    /unsupported maker/,
  );
});

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

test('identifies relisted auction cars and keeps the latest auction date', () => {
  const base = {
    source: 'A-Automarket',
    title: '2025 Subaru Chiffon CUSTOM R',
    year: 2025,
    mileageKm: 7000,
    location: 'GAO Stock',
    images: [] as string[],
    cost: { auctionPriceJpy: 1675000 },
  };
  const cars = [
    { ...base, _id: 'older', auctionDate: '2026-08-02' },
    { ...base, _id: 'newest', auctionDate: '2026-08-05' },
    {
      ...base,
      _id: 'middle',
      title: '  2025   SUBARU Chiffon CUSTOM R ',
      location: 'gao   stock',
      auctionDate: '04.08.2026',
    },
  ];

  const groups = findDuplicateScrapedAuctions(cars);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].keeper._id, 'newest');
  assert.deepEqual(groups[0].duplicates.map((car) => car._id), ['middle', 'older']);
});

test('does not merge cars when a fingerprint field or auction source differs', () => {
  const base = {
    source: 'A-Automarket',
    title: '2024 Subaru Chiffon G',
    year: 2024,
    mileageKm: 17000,
    location: 'LAP Kyoyuzaiko',
    auctionDate: '2026-08-04',
    images: [] as string[],
    cost: { auctionPriceJpy: 1359000 },
  };
  const cars = [
    { ...base, _id: 'base' },
    { ...base, _id: 'price', cost: { auctionPriceJpy: 1360000 } },
    { ...base, _id: 'mileage', mileageKm: 18000 },
    { ...base, _id: 'location', location: 'USS Tokyo' },
    { ...base, _id: 'source', source: 'JP Center' },
    { ...base, _id: 'unknown-mileage-1', mileageKm: 0 },
    { ...base, _id: 'unknown-mileage-2', mileageKm: 0 },
  ];

  assert.deepEqual(findDuplicateScrapedAuctions(cars), []);
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

test('filters Automarket imports by preferred auction grade before applying the limit', () => {
  const base = {
    id: '1',
    lotNumber: '100',
    auctionDate: '2026-07-23',
    auctionName: 'USS Tokyo',
    maker: 'TOYOTA',
    model: 'ROOMY',
    vehicleGrade: 'G',
    year: 2026,
    mileageKm: 8000,
    engineCapacity: 1000,
    transmission: 'IAT',
    color: 'BLACK',
    modelCode: 'M900A',
    equipment: 'AC',
    auctionPriceJpy: 800000,
    detailPath: '/auctions/?p=project/lot&id=1',
  };
  const rows = [
    { ...base, auctionGrade: '4', id: '1' },
    { ...base, auctionGrade: '4.5', id: '2' },
    { ...base, auctionGrade: '4.5', id: '3' },
  ];

  assert.deepEqual(
    selectEligibleAutomarketRows(rows, 1, '4.5', '2026-07-22').map((row) => row.id),
    ['2'],
  );
});

test('selects upcoming Automarket rows before the authoritative detail price is loaded', () => {
  const base = {
    lotNumber: '100',
    auctionName: 'USS Tokyo',
    maker: 'TOYOTA',
    model: 'ROOMY',
    vehicleGrade: 'G',
    year: 2026,
    mileageKm: 8000,
    engineCapacity: 1000,
    transmission: 'IAT',
    color: 'BLACK',
    modelCode: 'M900A',
    equipment: 'AC',
    auctionPriceJpy: 800000,
    detailPath: '/auctions/?p=project/lot',
    auctionGrade: '4.5',
  };
  const rows = [
    { ...base, id: 'past', auctionDate: '2026-07-21' },
    { ...base, id: 'today', auctionDate: '2026-07-22' },
    { ...base, id: 'future', auctionDate: '23.07.2026' },
    { ...base, id: 'unknown', auctionDate: '' },
    { ...base, id: 'no-price', auctionDate: '2026-07-24', auctionPriceJpy: 0 },
  ];

  assert.deepEqual(
    selectEligibleAutomarketRows(rows, undefined, undefined, '2026-07-22').map((row) => row.id),
    ['today', 'future', 'no-price'],
  );
});

test('extracts the authenticated Automarket detail-page average price request and result', () => {
  const detailHtml = `
    <div id="average_price"></div>
    <script>
      function getAveragePrice(company_ref, model_ref, model_year, displacement, model_type, grade, scores) {}
      getAveragePrice('9', '3174', '2024', '1000', 'M900A', 'CUSTOM G-T', '5');
    </script>
  `;
  const ajaxResponse = String.raw`+:var res = '<td>Average price:</td><td><h2><font id=\"average-price-sum\" color=\"red\">1683000 JPY</font></h2></td>'; res;`;

  assert.deepEqual(extractAutomarketAveragePriceArgs(detailHtml), [
    '9',
    '3174',
    '2024',
    '1000',
    'M900A',
    'CUSTOM G-T',
    '5',
  ]);
  assert.equal(extractAutomarketAveragePriceJpy(ajaxResponse), 1_683_000);
  assert.equal(extractAutomarketAveragePriceJpy('<div>Average price unavailable</div>'), 0);
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

test('recognizes Automarket image zero as the auction sheet', () => {
  assert.equal(
    isAutomarketAuctionSheetUrl(
      'https://i.aleado.ru/pic/?system=auto&date=2026-07-18&auct=81&bid=3006&number=0',
    ),
    true,
  );
  assert.equal(
    isAutomarketAuctionSheetUrl(
      'https://i.aleado.ru/pic/?system=auto&date=2026-07-18&auct=81&bid=3006&number=1',
    ),
    false,
  );
});

test('allows scraper requests only to approved auction and image hosts', () => {
  assert.equal(isApprovedAutomarketUrl('https://auctions.a-automarket.com/auctions?p=project/findlots'), true);
  assert.equal(isApprovedAutomarketUrl('https://auctions.a-automarket.com.evil.example/'), false);
  assert.equal(isApprovedAutomarketUrl('https://example.com/'), false);

  assert.equal(isApprovedAuctionImageUrl('https://i.aleado.ru/pic/?system=auto&number=1'), true);
  assert.equal(isApprovedAuctionImageUrl('https://8.ajes.com/imgs/example.jpg'), true);
  assert.equal(isApprovedAuctionImageUrl('http://8.ajes.com/imgs/example.jpg'), false);
  assert.equal(isApprovedAuctionImageUrl('https://i.aleado.ru.evil.example/example.jpg'), false);
});
