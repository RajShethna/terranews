import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { FEEDS, MAX_FEED_BYTES, USER_AGENT } from './config.js';
import { parseFeed, mergeArchive, buildFeed } from './pipeline.js';

const ROOT = new URL('../../', import.meta.url);
const ARCHIVE = new URL('data/archive.json', ROOT);
const FEED = new URL('feed.json', ROOT);
const MIN_SOURCES = Number(process.env.MIN_SOURCES) || 2;

async function readCapped(res, max) {
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      throw new Error(`feed exceeds ${max} bytes`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function fetchFeed(feed) {
  const res = await fetch(feed.url, {
    headers: { 'user-agent': USER_AGENT, accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  return parseFeed(await readCapped(res, MAX_FEED_BYTES), feed.name);
}

async function readArchive() {
  try {
    return JSON.parse(await readFile(ARCHIVE, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

const countStories = feed => Object.values(feed.locations).reduce((n, s) => n + s.length, 0);

async function main() {
  const now = Date.now();
  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  const fresh = [];
  const ok = [];
  results.forEach((r, i) => {
    const name = FEEDS[i].name;
    if (r.status === 'fulfilled') {
      fresh.push(...r.value);
      ok.push(name);
      console.log(`ok    ${name.padEnd(18)} ${r.value.length} items`);
    } else {
      console.log(`FAIL  ${name.padEnd(18)} ${r.reason?.message ?? r.reason}`);
    }
  });
  if (!ok.length) {
    console.error('Every outlet failed; leaving the existing feed untouched.');
    process.exitCode = 1;
    return;
  }

  const archive = mergeArchive(await readArchive(), fresh, now);
  const feed = buildFeed(archive, now, { minSources: MIN_SOURCES, outlets: ok });

  await mkdir(new URL('data/', ROOT), { recursive: true });
  await writeFile(ARCHIVE, '[\n' + archive.map(a => JSON.stringify(a)).join(',\n') + '\n]\n');
  await writeFile(FEED, JSON.stringify(feed));

  const coverage = [1, 2, 3].map(n => {
    const f = buildFeed(archive, now, { minSources: n, outlets: ok });
    return `${n}+ sources: ${Object.keys(f.locations).length} locations / ${countStories(f)} stories`;
  });
  console.log(`\n${ok.length}/${FEEDS.length} outlets, ${fresh.length} fetched, ${archive.length} archived (7 days)`);
  console.log(`published at MIN_SOURCES=${MIN_SOURCES}: ${Object.keys(feed.locations).length} locations, ${countStories(feed)} stories, ${feed.links.length} links`);
  console.log('coverage by threshold -> ' + coverage.join(' | '));
}

await main();
