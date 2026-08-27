from playwright.sync_api import sync_playwright
import os, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
MAP = {
 'react-dom@18.3.1/umd/react-dom.production.min.js': 'vendor/react-dom.production.min.js',
 'react@18.3.1/umd/react.production.min.js':         'vendor/react.production.min.js',
 '@babel/standalone@7.29.0/babel.min.js':            'vendor/babel.min.js',
}
WIDTHS = [(320,700),(360,780),(390,844),(414,896),(768,1024),(1280,900)]

JS = """() => {
  const de = document.documentElement, vw = de.clientWidth;
  // clipped content (ignore the ticker: it is intentionally wider than the screen)
  const clipped = [];
  document.querySelectorAll('*').forEach(el => {
    const b = el.getBoundingClientRect();
    if (b.width > 4 && b.right > vw + 1) {
      const t = (el.textContent||'').trim().replace(/\\s+/g,' ').slice(0,30);
      // structural check, not text-based: catches every ticker child (including
      // the empty-text colour-dot spans a text/className match would miss).
      // Walks ancestors via computed style rather than the style attribute
      // string, since the browser re-serializes "animation:ticker" with a
      // space ("animation: ticker …"), which breaks an attribute substring match.
      let inTicker = false;
      for (let n = el; n; n = n.parentElement) {
        if (getComputedStyle(n).animationName === 'ticker') { inTicker = true; break; }
      }
      if (!inTicker)
        clipped.push(t || el.tagName);
    }
  });
  // overlapping floating panels (modals/toasts at z>=25 are meant to sit on top)
  const boxes = [];
  document.querySelectorAll('[style*="position:absolute"]').forEach(el => {
    const b = el.getBoundingClientRect(), z = parseInt(getComputedStyle(el).zIndex);
    if (b.width>60 && b.height>30 && b.width < vw*0.99 && !(z>=25))
      boxes.push({n: el.id||el.tagName.toLowerCase(), x:b.x, y:b.y, r:b.right, bo:b.bottom});
  });
  const overlaps = [];
  for (let i=0;i<boxes.length;i++) for (let j=i+1;j<boxes.length;j++) {
    const a=boxes[i], c=boxes[j];
    const ox = Math.min(a.r,c.r)-Math.max(a.x,c.x), oy = Math.min(a.bo,c.bo)-Math.max(a.y,c.y);
    if (ox>8 && oy>8) overlaps.push(a.n+' X '+c.n);
  }
  // tap targets
  const small = [];
  document.querySelectorAll('a,button,input,[style*="cursor:pointer"]').forEach(el => {
    const b = el.getBoundingClientRect();
    if (b.width>0 && b.height>0 && b.height<28)
      small.push(Math.round(b.width)+'x'+Math.round(b.height));
  });
  return {
    overflow: de.scrollWidth - vw,
    unrendered: (document.body.innerText.match(/\\{\\{/g)||[]).length,
    clipped, overlaps, small
  };
}"""

def route(r):
    u = r.request.url
    for k, v in MAP.items():
        if k in u:
            return r.fulfill(status=200, content_type='application/javascript',
                             body=open(os.path.join(ROOT, v), encoding='utf-8').read())
    r.abort() if u.startswith('http') else r.continue_()

fail = False
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path='/opt/pw-browsers/chromium')
    for page in ['index.html', 'globe.html']:
        for w, h in WIDTHS:
            # touch emulation up to 900px: matches the site's own max-width:900px
            # breakpoint — real devices at 768px (tablets) are touchscreens, so a
            # mouse-only test there would miss the pointer:coarse tap-target rules
            pg = b.new_page(viewport={'width':w,'height':h}, is_mobile=w<500, has_touch=w<=900)
            pg.route('**/*', route)
            pg.goto('file://' + os.path.join(ROOT, page))
            pg.wait_for_timeout(3500)
            r = pg.evaluate(JS)
            bad = r['overflow']>1 or r['unrendered'] or r['clipped'] or r['overlaps'] or r['small']
            fail = fail or bad
            print(('FAIL' if bad else 'ok  '), '%-11s %4dx%-4d overflow=%-4d unrendered=%-3d clipped=%-2d overlaps=%-2d tiny-targets=%d'
                  % (page, w, h, r['overflow'], r['unrendered'], len(r['clipped']), len(r['overlaps']), len(r['small'])))
            for x in r['clipped'][:3]:  print('       clipped:', x)
            for x in r['overlaps'][:3]: print('       overlap:', x)
            pg.close()
    b.close()
sys.exit(1 if fail else 0)
