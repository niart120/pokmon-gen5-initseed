#!/usr/bin/env node
/*
  Encounter tables scraper for BW/BW2
  - Primary source: Pokebook (静的HTML表)
  - Output: src/data/encounters/generated/v1/<ROMVersion>/<Method>.json
  - Schema: EncounterLocationsJson (see src/data/encounters/schema.ts)

  Notes
  - This script is for data acquisition in development. Do NOT fetch at runtime.
  - Always commit generated JSON for reproducible builds.
*/

import fs from 'node:fs/promises';
import path from 'node:path';
import fetch from 'node-fetch';
import { load as loadHtml } from 'cheerio';

// 未知のJP種名を収集するセット（実行中のみ）
let MISSING_SPECIES = new Set();

// ターゲットとするメソッド（濃い草むらはスコープ外）
const METHODS = [
  'Normal', // 草むら, 洞窟
  'ShakingGrass', // 揺れる草むら
  'DustCloud', // 土煙（洞窟系）
  'Surfing', // なみのり（通常）
  'SurfingBubble', // なみのり（泡）
  'Fishing', // つり（通常）
  'FishingBubble', // つり（泡）
];

const VERSIONS = ['B', 'W', 'B2', 'W2'];

function normalizeLocationKey(location) {
  return location.trim().replace(/[\u3000\s]+/g, '').replace(/[‐‑‒–—−\-_.]/g, '');
}

function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toInt(n, def = 0) {
  const x = parseInt(String(n).trim(), 10);
  return Number.isFinite(x) ? x : def;
}

function parseLevelRangeFromText(text) {
  const m = String(text).match(/(\d+)\D+(\d+)/);
  if (m) {
    const min = toInt(m[1]);
    const max = toInt(m[2]);
    if (min && max) return { min, max };
  }
  const single = String(text).match(/(\d+)/);
  if (single) {
    const v = toInt(single[1]);
    return { min: v, max: v };
  }
  return { min: 1, max: 1 };
}

// name alias → canonical English name（未使用）
const NAME_ALIASES = new Map([
  // ['ヨーテリー', 'Lillipup'],
]);

// 実URL: Pokebook 各バージョンの遭遇テーブル（各メソッドは同一ページ内セクションに存在）
const SOURCE_MAP = {
  B: {
    Normal: 'https://pokebook.jp/data/sp5/enc_b',
    ShakingGrass: 'https://pokebook.jp/data/sp5/enc_b',
    DustCloud: 'https://pokebook.jp/data/sp5/enc_b',
    Surfing: 'https://pokebook.jp/data/sp5/enc_b',
    SurfingBubble: 'https://pokebook.jp/data/sp5/enc_b',
    Fishing: 'https://pokebook.jp/data/sp5/enc_b',
    FishingBubble: 'https://pokebook.jp/data/sp5/enc_b',
  },
  W: {
    Normal: 'https://pokebook.jp/data/sp5/enc_w',
    ShakingGrass: 'https://pokebook.jp/data/sp5/enc_w',
    DustCloud: 'https://pokebook.jp/data/sp5/enc_w',
    Surfing: 'https://pokebook.jp/data/sp5/enc_w',
    SurfingBubble: 'https://pokebook.jp/data/sp5/enc_w',
    Fishing: 'https://pokebook.jp/data/sp5/enc_w',
    FishingBubble: 'https://pokebook.jp/data/sp5/enc_w',
  },
  B2: {
    Normal: 'https://pokebook.jp/data/sp5/enc_b2',
    ShakingGrass: 'https://pokebook.jp/data/sp5/enc_b2',
    DustCloud: 'https://pokebook.jp/data/sp5/enc_b2',
    Surfing: 'https://pokebook.jp/data/sp5/enc_b2',
    SurfingBubble: 'https://pokebook.jp/data/sp5/enc_b2',
    Fishing: 'https://pokebook.jp/data/sp5/enc_b2',
    FishingBubble: 'https://pokebook.jp/data/sp5/enc_b2',
  },
  W2: {
    Normal: 'https://pokebook.jp/data/sp5/enc_w2',
    ShakingGrass: 'https://pokebook.jp/data/sp5/enc_w2',
    DustCloud: 'https://pokebook.jp/data/sp5/enc_w2',
    Surfing: 'https://pokebook.jp/data/sp5/enc_w2',
    SurfingBubble: 'https://pokebook.jp/data/sp5/enc_w2',
    Fishing: 'https://pokebook.jp/data/sp5/enc_w2',
    FishingBubble: 'https://pokebook.jp/data/sp5/enc_w2',
  },
};

// スロット率プリセット
const SLOT_RATE_PRESETS = {
  Normal: [20, 20, 10, 10, 10, 10, 5, 5, 4, 4, 1, 1],
  ShakingGrass: [20, 20, 10, 10, 10, 10, 5, 5, 4, 4, 1, 1],
  DustCloud: [20, 20, 10, 10, 10, 10, 5, 5, 4, 4, 1, 1],
  Surfing: [60, 30, 5, 4, 1],
  SurfingBubble: [60, 30, 5, 4, 1],
  Fishing: [60, 30, 5, 4, 1],
  FishingBubble: [60, 30, 5, 4, 1],
};

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'encounter-scraper/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

async function loadSpeciesNameToId() {
  const file = path.resolve('src/data/pokemon-species.ts');
  const txt = await fs.readFile(file, 'utf8');

  // Prefer fast path: inline comment after ID, e.g., "509: { // Purrloin"
  const quick = new Map();
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*(\d+):\s*\{\s*\/\/\s*([^\r\n]+)/);
    if (m) quick.set(m[2].trim(), parseInt(m[1], 10));
  }

  if (quick.size > 0) return quick;

  // Fallback: scan blocks to capture nationalDex and name fields
  const map = new Map();
  const idRe = /nationalDex:\s*(\d+)/;
  const nameRe = /name:\s*'([^']+)'/;
  let currentId = null;
  for (const line of txt.split(/\r?\n/)) {
    const idM = line.match(idRe);
    if (idM) currentId = parseInt(idM[1], 10);
    const nameM = line.match(nameRe);
    if (currentId && nameM) {
      map.set(nameM[1], currentId);
      currentId = null;
    }
  }
  return map;
}

async function loadSpeciesAliasJa() {
  const aliasPath = path.resolve('src/data/encounters/aliases/species-ja.json');
  try {
    const txt = await fs.readFile(aliasPath, 'utf8');
    const obj = JSON.parse(txt);
    const m = new Map();
    for (const [k, v] of Object.entries(obj)) m.set(k, v);
    return m;
  } catch (_) {
    return new Map();
  }
}

function canonicalizeSpeciesName(raw) {
  const t = String(raw).trim();
  // Remove bracketed notes and spaces
  return t.replace(/\s*\([^)]*\)\s*$/, '').replace(/[\u3000\s]+/g, '');
}

function findSectionTables($, method) {
  // 見出しテキストでセクション境界を抽出
  const headers = $('h1,h2,h3,h4,h5').toArray();
  const textOf = (el) => ($(el).text() || '').replace(/[\s\u3000]+/g, '');
  const matchers = {
    Normal: (t) => t.includes('草むら') && t.includes('洞窟') && !t.includes('濃い草むら'),
    ShakingGrass: (t) => t.includes('揺れる草むら') || t.includes('土煙'),
    DustCloud: (t) => t.includes('揺れる草むら') || t.includes('土煙'),
    Surfing: (t) => t.includes('なみのり') || t.includes('つり'),
    SurfingBubble: (t) => t.includes('なみのり') || t.includes('つり'),
    Fishing: (t) => t.includes('なみのり') || t.includes('つり'),
    FishingBubble: (t) => t.includes('なみのり') || t.includes('つり'),
  };
  const isHeader = (el) => /^h[1-6]$/i.test(el.tagName || el.name || '');

  let startIdx = -1;
  for (let i = 0; i < headers.length; i++) {
    const t = textOf(headers[i]);
    if (matchers[method]?.(t)) {
      // 濃い草むらは除外（完全一致を避ける）
      if (method === 'Normal' && t.includes('濃い草むら')) continue;
      startIdx = i; break;
    }
  }
  if (startIdx === -1) return [];

  const tables = [];
  for (let i = startIdx + 1; i < headers.length; i++) {
    const el = headers[i];
    // 次の同レベル以上の見出しが来たら終了
    if (isHeader(el)) break;
  }
  // start headerから次のheader直前までの兄弟要素を走査
  let node = $(headers[startIdx]).next();
  while (node && node.length) {
    const name = node[0].name || node[0].tagName || '';
    if (/^h[1-6]$/i.test(name)) break;
    if (name === 'table') tables.push(node);
    node = node.next();
  }
  return tables;
}

function parseWideRowIntoSlots($, tr, method, aliasJa) {
  const tds = $(tr).find('td');
  if (tds.length < 13) return null; // 1列:ロケーション + 12枠
  const locText = $(tds[0]).text().trim();
  const displayName = locText.replace(/^\[[^\]]+\]\s*/, '').trim();

  const rates = SLOT_RATE_PRESETS[method] || SLOT_RATE_PRESETS.Normal;
  const slots = [];
  for (let i = 1; i <= 12 && i < tds.length; i++) {
    const cell = $(tds[i]).text().trim();
    if (!cell) continue;
    // 形式: 名前(レベル) または 名前(最小～最大)
    const nameMatch = cell.match(/^([^()]+)\(([^)]+)\)$/);
    if (!nameMatch) continue;
    const rawName = canonicalizeSpeciesName(nameMatch[1]);
    const lvlText = nameMatch[2];
    const levelRange = parseLevelRangeFromText(lvlText);

    const speciesId = aliasJa.get(rawName);
    if (!speciesId) {
      MISSING_SPECIES.add(rawName);
      continue;
    }

    const rate = rates[i - 1] ?? 1;
    slots.push({ speciesId, rate, levelRange });
  }
  if (!slots.length) return null;
  return { displayName, slots };
}

function rowLooksLikeDust($, tr) {
  // 種族にモグリュー/ドリュウズが含まれる行は「土煙」寄りとみなす
  const tds = $(tr).find('td');
  for (let i = 1; i < tds.length; i++) {
    const txt = $(tds[i]).text();
    if (/モグリュー|ドリュウズ/.test(txt)) return true;
  }
  return false;
}

// 5枠の水用行パース（先頭はロケーション名(場合あり) + 5枠）
function parseWaterRowSlots($, tr, method, aliasJa) {
  const tds = $(tr).find('td');
  const startIdx = tds.length === 6 ? 1 : 0; // locセル付き=6、なし=5
  const rates = SLOT_RATE_PRESETS[method] || SLOT_RATE_PRESETS.Surfing;
  const slots = [];
  for (let i = 0; i < 5 && startIdx + i < tds.length; i++) {
    const cell = $(tds[startIdx + i]).text().trim();
    if (!cell) continue;
    const m = cell.match(/^([^()]+)\(([^)]+)\)$/);
    if (!m) continue;
    const rawName = canonicalizeSpeciesName(m[1]);
    const levelRange = parseLevelRangeFromText(m[2]);
    const speciesId = aliasJa.get(rawName);
    if (!speciesId) {
      MISSING_SPECIES.add(rawName);
      continue;
    }
    slots.push({ speciesId, rate: rates[i] ?? 1, levelRange });
  }
  return slots;
}

function isLocationRow($, tr) {
  const td0 = $(tr).find('td').first();
  if (!td0.length) return false;
  const txt = td0.text().trim();
  return /^\[[^\]]+\]/.test(txt) || /\S/.test(txt) && ($(tr).find('td').length >= 6);
}

function extractDisplayNameFromRow($, tr) {
  const td0 = $(tr).find('td').first();
  const locText = td0.text().trim();
  return locText.replace(/^\[[^\]]+\]\s*/, '').trim();
}

function parseWaterEncounterPage(html, { version, method, url, aliasJa }) {
  const $ = loadHtml(html);
  const locations = {};
  const tables = findSectionTables($, method);
  if (!tables.length) return { version, method, source: { name: 'Pokebook', url, retrievedAt: todayISO() }, locations };

  for (const tbl of tables) {
    const rows = $(tbl).find('tbody tr, tr').toArray();
    for (let i = 0; i < rows.length; i++) {
      const tr = rows[i];
      if (!isLocationRow($, tr)) continue;
      const displayName = extractDisplayNameFromRow($, tr);
      const group = [tr, rows[i + 1], rows[i + 2], rows[i + 3]].filter(Boolean);
      // 行インデックス→メソッド
      const indexToMethod = ['Surfing', 'SurfingBubble', 'Fishing', 'FishingBubble'];
      for (let gi = 0; gi < group.length; gi++) {
        const targetMethod = indexToMethod[gi];
        if (targetMethod !== method) continue;
        const slots = parseWaterRowSlots($, group[gi], method, aliasJa);
        if (!slots.length) continue;
        if (!locations[displayName]) locations[displayName] = { displayName, slots: [] };
        locations[displayName].slots.push(...slots);
      }
      i += Math.max(0, group.length - 1); // グループ分スキップ
    }
  }

  return { version, method, source: { name: 'Pokebook', url, retrievedAt: todayISO() }, locations };
}

// セクションごとのパース
function parseEncounterPage(html, { version, method, url, aliasJa }) {
  const waterMethods = new Set(['Surfing', 'SurfingBubble', 'Fishing', 'FishingBubble']);
  if (waterMethods.has(method)) {
    return parseWaterEncounterPage(html, { version, method, url, aliasJa });
  }

  const $ = loadHtml(html);
  const locations = {};

  const tables = findSectionTables($, method);
  if (!tables.length) {
    return { version, method, source: { name: 'Pokebook', url, retrievedAt: todayISO() }, locations };
  }

  for (const tbl of tables) {
    $(tbl)
      .find('tbody tr, tr')
      .each((_, tr) => {
        // 揺れる草/土煙は同一セクションのため、メソッドごとにフィルタ
        if (method === 'ShakingGrass' && rowLooksLikeDust($, tr)) return;
        if (method === 'DustCloud' && !rowLooksLikeDust($, tr)) return;

        const parsed = parseWideRowIntoSlots($, tr, method, aliasJa);
        if (!parsed) return;
        const key = parsed.displayName; // displayNameはそのまま保持（内部正規化はローダ側）
        if (!locations[key]) locations[key] = { displayName: parsed.displayName, slots: [] };
        // 同一ロケーションが複数行になる場合は統合（出現枠の上書きはしないが末尾追加）
        locations[key].slots.push(...parsed.slots);
      });
  }

  return {
    version,
    method,
    source: { name: 'Pokebook', url, retrievedAt: todayISO() },
    locations,
  };
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function writeJson(file, data) {
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
}

async function scrapeVersionMethod(version, method, overrideUrl) {
  // 各実行ごとに未知種名セットをリセット
  MISSING_SPECIES = new Set();
  const url = overrideUrl || SOURCE_MAP[version]?.[method];
  if (!url) {
    console.warn(`[skip] No source URL for ${version}/${method}`);
    return;
  }
  if (!METHODS.includes(method)) {
    console.warn(`[skip] Method ${method} not implemented yet`);
    return;
  }
  console.log(`[fetch] ${version}/${method} → ${url}`);
  const html = await fetchHtml(url);
  const aliasJa = await loadSpeciesAliasJa();
  const json = parseEncounterPage(html, { version, method, url, aliasJa });
  const outPath = path.resolve(
    'src/data/encounters/generated/v1',
    version,
    `${method}.json`
  );
  await writeJson(outPath, json);
  console.log(`[ok] wrote ${outPath} (${Object.keys(json.locations).length} locations)`);
  if (MISSING_SPECIES.size) {
    console.warn(`[warn] Unknown JP species (${MISSING_SPECIES.size}) for ${version}/${method}: ${[...MISSING_SPECIES].join(', ')}`);
  }
}

function parseArgs() {
  const get = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];
  return {
    version: get('version'),
    method: get('method'),
    url: get('url'),
  };
}

async function main() {
  const args = parseArgs();
  const versions = args.version ? [args.version] : VERSIONS;
  const methods = args.method ? [args.method] : METHODS;

  for (const v of versions) {
    for (const m of methods) {
      try {
        await scrapeVersionMethod(v, m, args.url);
      } catch (e) {
        console.error(`[error] ${v}/${m}:`, e.message);
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
