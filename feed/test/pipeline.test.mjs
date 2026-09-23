import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFeed, cleanText, matchLocations, classify, mergeArchive, buildFeed } from '../src/pipeline.js';

const NOW = Date.parse('2026-09-23T12:00:00Z');
const h = n => new Date(NOW - n * 3_600_000).toUTCString();

const rss = (items) => `<?xml version="1.0"?><rss version="2.0"><channel><title>x</title>${items.map(i => `
  <item><title><![CDATA[${i.title}]]></title><link>${i.link}</link><pubDate>${i.date}</pubDate>
  <description>${i.desc ?? ''}</description></item>`).join('')}</channel></rss>`;

const NPR = rss([
  { title: 'Russian missile barrage kills 14 in Kyiv overnight', link: 'https://npr.org/a1', date: h(5),
    desc: '&lt;p&gt;Russia launched dozens of missiles and drones at the Ukrainian capital overnight, officials said, killing at least 14 people.&lt;/p&gt;' },
  { title: 'Gaza aid convoy halted as Israeli strikes continue', link: 'https://npr.org/a2', date: h(8),
    desc: 'Aid groups said an Israeli strike forced a UN convoy to turn back in northern Gaza, where Hamas-run authorities reported casualties.' },
  { title: 'New Mexico wildfire forces evacuations', link: 'https://npr.org/a3', date: h(3),
    desc: 'Crews in New Mexico battled a fast-moving wildfire.' },
]);

const AJ = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
  <entry><title>Kyiv hit by massive Russian missile and drone attack, 14 killed</title>
    <link rel="alternate" href="https://aljazeera.com/k1"/><published>${new Date(NOW - 4 * 3.6e6).toISOString()}</published>
    <summary type="html">&lt;b&gt;Ukraine&lt;/b&gt; says Russia fired missiles and drones at Kyiv, killing 14 &amp; wounding dozens.</summary></entry>
  <entry><title>Israeli strikes on Gaza as aid convoy turned back</title>
    <link href="https://aljazeera.com/g1"/><published>${new Date(NOW - 7 * 3.6e6).toISOString()}</published>
    <summary>Israel pressed strikes across Gaza as a UN aid convoy was turned back, according to Palestinian officials.</summary></entry>
  <entry><title>&lt;img src=x onerror=alert(1)&gt; Seoul markets rally</title>
    <link href="javascript:alert(1)"/><published>${new Date(NOW - 2 * 3.6e6).toISOString()}</published><summary>x</summary></entry>
</feed>`;

const CBC = rss([
  { title: 'Death toll rises after Russian attack on Kyiv', link: 'https://cbc.ca/k', date: h(3),
    desc: 'Ukrainian officials said the missile and drone attack on Kyiv killed 14.' },
  { title: 'Carney unveils new trade measures in Ottawa', link: 'https://cbc.ca/t', date: h(6),
    desc: 'Canada announced tariff relief for exporters amid slowing trade.' },
  { title: 'Washington Post reporter wins award', link: 'https://cbc.ca/wp', date: h(6), desc: 'An arts award.' },
  { title: 'Old story about Brazil', link: 'https://cbc.ca/old', date: new Date(NOW - 9 * 86_400_000).toUTCString(), desc: 'Brazil.' },
]);

test('cleanText strips CDATA, raw and entity-encoded HTML', () => {
  assert.equal(cleanText('<![CDATA[<p>Hello &amp; <b>world</b></p>]]>'), 'Hello & world');
  assert.equal(cleanText('&lt;p&gt;Encoded &lt;i&gt;html&lt;/i&gt;&lt;/p&gt;'), 'Encoded html');
  assert.equal(cleanText('It&#8217;s &#x2014; fine'), 'It’s — fine');
});

test('parseFeed handles RSS and Atom, drops unsafe links', () => {
  const npr = parseFeed(NPR, 'NPR World');
  assert.equal(npr.length, 3);
  assert.equal(npr[0].link, 'https://npr.org/a1');
  assert.ok(!npr[0].desc.includes('<'));
  const aj = parseFeed(AJ, 'Al Jazeera');
  assert.equal(aj.length, 2, 'javascript: link must be dropped');
  assert.equal(aj[0].link, 'https://aljazeera.com/k1');
  assert.equal(aj[1].link, 'https://aljazeera.com/g1');
});

test('location matching avoids known false positives', () => {
  assert.deepEqual(matchLocations('New Mexico wildfire forces evacuations', 'Crews in New Mexico battled a fire.'), []);
  assert.deepEqual(matchLocations('Washington Post reporter wins award', ''), []);
  assert.ok(matchLocations('Mexico City protests', '').includes('mexico'));
  assert.deepEqual(matchLocations('Storm in the Indian Ocean', ''), []);
  assert.ok(matchLocations('Lula meets investors in Brasília', '').includes('brasilia'));
  const gaza = matchLocations('Israeli strikes on Gaza', 'Israel pressed strikes across Gaza.');
  assert.ok(gaza.includes('gaza') && gaza.includes('jerusalem'));
  assert.deepEqual(matchLocations('Michael Jordan returns to Chicago', ''), []);
  assert.ok(matchLocations('Jordan hosts regional summit', '').includes('amman'));
  assert.ok(!matchLocations('South Sudan clashes displace thousands', '').includes('khartoum'));
  assert.ok(matchLocations('Sudan army retakes Khartoum airport', '').includes('khartoum'));
  assert.deepEqual(matchLocations('Pilgrims flock to Santiago de Compostela', ''), []);
  assert.ok(matchLocations('EU agrees new sanctions package', '').includes('brussels'));
  assert.ok(!matchLocations('Rs17.2bn project launched to boost climate resilience in GB', 'The EU-funded project, backed by the European Union and the EU delegation, will help Pakistan.').includes('brussels'));
});

test('classify picks sensible categories', () => {
  assert.equal(classify('Russian missile barrage kills 14 in Kyiv', ''), 'security');
  assert.equal(classify('Canada unveils new tariff relief for exporters', 'trade slows'), 'business');
  assert.equal(classify('Floods displace thousands after monsoon rains', ''), 'environment');
  assert.equal(classify('Dengue outbreak strains hospitals', ''), 'health');
});

test('end-to-end: clusters one story across outlets, enforces min sources, emits links', () => {
  const fresh = [...parseFeed(NPR, 'NPR World'), ...parseFeed(AJ, 'Al Jazeera'), ...parseFeed(CBC, 'CBC News')];
  const archive = mergeArchive([], fresh, NOW);
  assert.ok(!archive.some(a => a.link === 'https://cbc.ca/old'), 'items older than 7 days are pruned');
  assert.ok(!archive.some(a => a.link === 'https://npr.org/a3'), 'unmatched items are not archived');

  const feed = buildFeed(archive, NOW, { minSources: 2, outlets: ['NPR World', 'Al Jazeera', 'CBC News'] });
  const kyiv = feed.locations.kyiv;
  assert.equal(kyiv.length, 1, 'three headlines about the same attack collapse into one story');
  assert.equal(kyiv[0].sources.length, 3);
  assert.deepEqual(kyiv[0].sources.map(s => s.name).sort(), ['Al Jazeera', 'CBC News', 'NPR World']);
  assert.equal(kyiv[0].cat, 'security');
  assert.ok(kyiv[0].detail.length >= 1 && kyiv[0].detail.every(p => !p.includes('<')));
  assert.equal(new Date(kyiv[0].date).getTime(), Date.parse(h(5)), 'story is dated by first report');

  assert.ok(!feed.locations.toronto, 'single-source story is withheld at minSources=2');
  assert.equal(buildFeed(archive, NOW, { minSources: 1, outlets: [] }).locations.toronto.length, 1);

  assert.equal(feed.locations.gaza[0].sources.length, 2);
  assert.ok(feed.links.some(l => [l.a, l.b].sort().join() === 'gaza,jerusalem'), 'co-mentioned locations are linked');
  assert.equal(feed.generatedAt, new Date(NOW).toISOString());
});

test('distinct events in the same place are not merged into one story', () => {
  const mk = (title, desc, outlet, link, hrs) => ({ title, desc, outlet, link, date: NOW - hrs * 3.6e6 });
  const fresh = [
    mk('Russian missile barrage kills 14 in Kyiv', 'Missiles and drones struck residential areas of Kyiv overnight.', 'NPR World', 'https://x/1', 5),
    mk('Kyiv hit by Russian missile attack, 14 dead', 'Russia fired missiles and drones at Kyiv.', 'CBC News', 'https://x/2', 4),
    mk('Ukraine parliament approves wartime budget', 'Lawmakers in Kyiv passed the budget after a long debate over defence spending and pensions.', 'Euronews', 'https://x/3', 6),
    mk('Ukrainian lawmakers pass 2027 budget', 'Ukraine’s parliament approved next year’s budget, prioritising pensions and defence.', 'Al Jazeera', 'https://x/4', 3),
  ];
  const feed = buildFeed(mergeArchive([], fresh, NOW), NOW, { minSources: 2, outlets: [] });
  assert.equal(feed.locations.kyiv.length, 2);
  for (const s of feed.locations.kyiv) assert.equal(s.sources.length, 2);
});

test('mergeArchive keeps prior items and does not duplicate links', () => {
  const fresh = parseFeed(NPR, 'NPR World');
  const a1 = mergeArchive([], fresh, NOW);
  const a2 = mergeArchive(a1, fresh, NOW + 3_600_000);
  assert.equal(a2.length, a1.length);
});
