// AIChE 2026 RSVP endpoint (Cloudflare Worker).
//
// The homepage POSTs {name, affiliation, email, events[], website} here.
// This worker appends one row per selected event to a CSV file in a
// PRIVATE GitHub repository, so attendee names never appear on the public
// site. The GitHub token lives only in the worker's secret store.
//
// Required settings (Cloudflare dashboard -> Worker -> Settings -> Variables):
//   GITHUB_TOKEN    secret  fine-grained PAT, Contents: Read and write, private repo only
//   GITHUB_REPO     text    e.g. AJinyoung-Kim/aiche-2026-rsvp
// Optional:
//   FILE_PATH       text    default "attendees.csv"
//   ALLOWED_ORIGIN  text    default "https://ajinyoung-kim.github.io"

const EVENTS = {
  poster: 'Poster - Sun Nov 8, 1:00-3:00 PM CST, Exhibit Hall B #126',
  oral: 'Talk - Wed Nov 11, 9:03 AM CST, Room 102B',
};
const HEADER = 'submitted_at_utc,event,name,affiliation,email\n';

export default {
  async fetch(request, env) {
    const allowed = env.ALLOWED_ORIGIN || 'https://ajinyoung-kim.github.io';
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': allowed,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    };
    const reply = (status, obj) =>
      new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return reply(405, { ok: false, error: 'POST only' });
    if (origin !== allowed) return reply(403, { ok: false, error: 'origin not allowed' });

    let body;
    try { body = await request.json(); } catch { return reply(400, { ok: false, error: 'bad json' }); }

    // honeypot: real visitors never see or fill this field
    if (body.website) return reply(200, { ok: true });

    const clean = (v, max) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
    const name = clean(body.name, 100);
    const affiliation = clean(body.affiliation, 150);
    const email = clean(body.email, 150);
    const events = Array.isArray(body.events) ? [...new Set(body.events)].filter((e) => e in EVENTS) : [];
    if (!name) return reply(400, { ok: false, error: 'name required' });
    if (!events.length) return reply(400, { ok: false, error: 'pick an event' });
    if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) return reply(500, { ok: false, error: 'not configured' });

    const now = new Date().toISOString();
    const rows = events.map((e) => [now, EVENTS[e], name, affiliation, email].map(csvCell).join(',') + '\n').join('');

    try {
      await appendToFile(env, rows);
      return reply(200, { ok: true });
    } catch (err) {
      return reply(502, { ok: false, error: 'storage failed' });
    }
  },
};

// Quote every cell, and neutralise spreadsheet formulas (=, +, -, @).
function csvCell(v) {
  let s = String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}

const b64encode = (text) => {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
const b64decode = (b64) =>
  new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0)));

// Read-modify-write through the GitHub Contents API. Two people submitting
// at the same moment make the second write fail with a stale sha (409/422),
// so re-read and retry.
async function appendToFile(env, rows) {
  const path = env.FILE_PATH || 'attendees.csv';
  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${encodeURIComponent(path)}`;
  const headers = {
    'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'aiche-rsvp-worker',
  };

  for (let attempt = 0; attempt < 4; attempt++) {
    const got = await fetch(url, { headers });
    let current = HEADER, sha;
    if (got.status === 200) {
      const j = await got.json();
      current = b64decode(j.content);
      sha = j.sha;
      if (!current.endsWith('\n')) current += '\n';
    } else if (got.status !== 404) {
      throw new Error('read ' + got.status);
    }

    const put = await fetch(url, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'RSVP',
        content: b64encode(current + rows),
        ...(sha ? { sha } : {}),
      }),
    });
    if (put.ok) return;
    if (put.status !== 409 && put.status !== 422) throw new Error('write ' + put.status);
    await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
  }
  throw new Error('write conflict');
}
