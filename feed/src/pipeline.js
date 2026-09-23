import { LOCATIONS, CATEGORIES, WINDOW_DAYS, MAX_STORIES_PER_LOCATION, MAX_ARCHIVE_ITEMS } from './config.js';

const DAY = 86_400_000;
const CLUSTER_WINDOW_MS = 48 * 3_600_000;
const CLUSTER_MIN_SIMILARITY = 0.32;
const MIN_LINK_COUNT = 2;
const MAX_LINKS = 40;

// \b is ASCII-only, so accented names (Brasília, Élysée) need Unicode-aware boundaries.
const wordRe = (terms, flags) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${terms.join('|')})(?![\\p{L}\\p{N}])`, flags);
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const LOC_RES = Object.entries(LOCATIONS).map(([id, terms]) => [id, wordRe(terms, 'gu')]);
const CAT_RES = Object.entries(CATEGORIES).map(([id, terms]) => [id, wordRe(terms.map(escapeRe), 'gu')]);

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…' };

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

// Descriptions arrive both as raw HTML and as entity-encoded HTML, so tags are stripped on both sides of decoding.
export function cleanText(raw) {
  if (!raw) return '';
  let s = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  s = s.replace(/<[^>]*>/g, ' ');
  s = decodeEntities(s);
  s = s.replace(/<[^>]*>/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

function tag(block, names) {
  for (const n of names) {
    const m = block.match(new RegExp(`<${n}\\b[^>]*>([\\s\\S]*?)</${n}>`, 'i'));
    if (m && m[1].trim()) return m[1];
  }
  return '';
}

function linkOf(block) {
  const atom = block.match(/<link\b(?=[^>]*\brel=["']alternate["'])[^>]*\bhref=["']([^"']+)["']/i)
    || block.match(/<link\b(?![^>]*\brel=)[^>]*\bhref=["']([^"']+)["']/i);
  if (atom) return decodeEntities(atom[1]).trim();
  const rss = cleanText(tag(block, ['link']));
  if (rss) return rss;
  const guid = block.match(/<guid\b[^>]*>([\s\S]*?)<\/guid>/i);
  return guid ? cleanText(guid[1]) : '';
}

const isHttpUrl = u => /^https?:\/\/[^\s"'<>]+$/i.test(u);

export function parseFeed(xml, outlet) {
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>|<entry\b[\s\S]*?<\/entry>/gi) || [];
  const items = [];
  for (const b of blocks) {
    const title = cleanText(tag(b, ['title']));
    const link = linkOf(b);
    const date = Date.parse(cleanText(tag(b, ['pubDate', 'published', 'updated', 'dc:date'])));
    if (!title || !isHttpUrl(link) || !Number.isFinite(date)) continue;
    const desc = cleanText(tag(b, ['description', 'summary', 'content:encoded', 'content']));
    items.push({ link, title, desc: desc.slice(0, 600), date, outlet });
  }
  return items;
}

const countMatches = (re, text) => { re.lastIndex = 0; let n = 0; while (re.exec(text)) n++; return n; };

export function matchLocations(title, desc) {
  const scored = [];
  for (const [id, re] of LOC_RES) {
    const t = countMatches(re, title), d = countMatches(re, desc);
    if (t > 0 || d >= 2) scored.push({ id, score: t * 3 + d });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, 3).map(s => s.id);
}

export function classify(title, desc) {
  const t = title.toLowerCase(), d = desc.toLowerCase();
  let best = 'politics', bestScore = 0;
  for (const [id, re] of CAT_RES) {
    const score = countMatches(re, t) * 2 + countMatches(re, d);
    if (score > bestScore) { best = id; bestScore = score; }
  }
  return best;
}

export function mergeArchive(prev, fresh, now) {
  const cutoff = now - WINDOW_DAYS * DAY;
  const byLink = new Map();
  for (const it of prev) if (it.date >= cutoff) byLink.set(it.link, it);
  for (const it of fresh) {
    if (byLink.has(it.link)) continue;
    const date = Math.min(it.date, now);
    if (date < cutoff) continue;
    const locs = matchLocations(it.title, it.desc);
    if (!locs.length) continue;
    byLink.set(it.link, { ...it, date, locs, cat: classify(it.title, it.desc) });
  }
  return [...byLink.values()].sort((a, b) => b.date - a.date).slice(0, MAX_ARCHIVE_ITEMS);
}

const STOP = new Set('the and for with from that this after over into amid says said will have has had are was were been its their they them his her who what when where why how not but new more than about just also out off one two year years day days week weeks'.split(' '));
// Crude suffix stripping so killed/kills/killing, Russia/Russian and Ukraine/Ukrainian compare equal.
function stem(w) {
  if (w.length > 4 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  if (w.length > 5 && w.endsWith('ing')) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith('ed')) w = w.slice(0, -2);
  if (w.length > 5 && w.endsWith('ian')) w = w.slice(0, -3);
  else if (w.length > 5 && w.endsWith('ia')) w = w.slice(0, -2);
  if (w.length > 4 && w.endsWith('e')) w = w.slice(0, -1);
  if (w.length > 5 && w.endsWith('i')) w = w.slice(0, -1);
  return w;
}
const tokens = s => (s.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []).filter(w => !STOP.has(w)).map(stem);

function vectors(items) {
  const docs = items.map(it => [...tokens(it.title), ...tokens(it.title), ...tokens(it.desc).slice(0, 40)]);
  const df = new Map();
  for (const d of docs) for (const w of new Set(d)) df.set(w, (df.get(w) || 0) + 1);
  const n = docs.length;
  return docs.map(d => {
    const tf = new Map();
    for (const w of d) tf.set(w, (tf.get(w) || 0) + 1);
    let norm = 0;
    for (const [w, c] of tf) { const v = c * (Math.log((n + 1) / (df.get(w) + 1)) + 1); tf.set(w, v); norm += v * v; }
    norm = Math.sqrt(norm) || 1;
    for (const [w, v] of tf) tf.set(w, v / norm);
    return tf;
  });
}

function cosine(a, b) {
  const [s, l] = a.size < b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [w, v] of s) { const o = l.get(w); if (o) dot += v * o; }
  return dot;
}

export function cluster(items) {
  const vec = vectors(items);
  const parent = items.map((_, i) => i);
  const find = i => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const sim = items.map(() => new Float64Array(items.length));
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (Math.abs(items[i].date - items[j].date) > CLUSTER_WINDOW_MS) continue;
      const c = cosine(vec[i], vec[j]);
      sim[i][j] = sim[j][i] = c;
      if (c >= CLUSTER_MIN_SIMILARITY) parent[find(i)] = find(j);
    }
  }
  const groups = new Map();
  items.forEach((_, i) => { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(i); });
  return [...groups.values()].map(idx => {
    let medoid = idx[0], best = -1;
    for (const i of idx) { let s = 0; for (const j of idx) s += sim[i][j]; if (s > best) { best = s; medoid = i; } }
    return { members: idx.map(i => items[i]), medoid: items[medoid] };
  });
}

function fnv1a(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}

function trimToSentences(s, max) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
  return end > max * 0.4 ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, '') + '…';
}

function toStory({ members, medoid }) {
  const sorted = [...members].sort((a, b) => a.date - b.date);
  const byOutlet = new Map();
  for (const m of sorted) if (!byOutlet.has(m.outlet)) byOutlet.set(m.outlet, m);
  const votes = new Map();
  for (const m of members) votes.set(m.cat, (votes.get(m.cat) || 0) + 1);
  const top = Math.max(...votes.values());
  const cat = votes.get(medoid.cat) === top ? medoid.cat : [...votes].find(([, v]) => v === top)[0];
  const detail = [...byOutlet.values()]
    .filter(m => m.desc.length >= 40 && m.desc !== m.title)
    .slice(0, 2)
    .map(m => `${trimToSentences(m.desc, 320)} (${m.outlet})`);
  return {
    id: 'l' + fnv1a(sorted[0].link),
    cat,
    date: new Date(sorted[0].date).toISOString(),
    title: medoid.title,
    detail: detail.length ? detail : [medoid.title],
    sources: [...byOutlet.values()].map(m => ({ name: m.outlet, url: m.link })),
  };
}

export function buildFeed(archive, now, { minSources, outlets }) {
  const locations = {};
  for (const id of Object.keys(LOCATIONS)) {
    const pool = archive.filter(it => it.locs.includes(id));
    if (!pool.length) continue;
    const stories = cluster(pool)
      .map(toStory)
      .filter(s => s.sources.length >= minSources)
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
      .slice(0, MAX_STORIES_PER_LOCATION);
    if (stories.length) locations[id] = stories;
  }

  const pairs = new Map();
  for (const it of archive) {
    if (it.locs.length < 2) continue;
    const ids = [...it.locs].sort();
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const key = ids[i] + '|' + ids[j];
      const p = pairs.get(key) || { count: 0, cats: new Map() };
      p.count++;
      p.cats.set(it.cat, (p.cats.get(it.cat) || 0) + 1);
      pairs.set(key, p);
    }
  }
  const links = [...pairs]
    .filter(([key, p]) => p.count >= MIN_LINK_COUNT && key.split('|').every(id => locations[id]))
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, MAX_LINKS)
    .map(([key, p]) => {
      const [a, b] = key.split('|');
      const cat = [...p.cats].sort((x, y) => y[1] - x[1])[0][0];
      return { a, b, cat, count: p.count };
    });

  return { version: 1, generatedAt: new Date(now).toISOString(), outlets, minSources, locations, links };
}
