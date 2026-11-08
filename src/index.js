// ClaimSure demo: login gate in front of the static app.
// Secrets: USERS (JSON of users), SESSION_SECRET (random string).

const COOKIE = "cs_session";
const MAX_AGE = 60 * 60 * 12; // 12 hours
const enc = new TextEncoder();

const b64url = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64urlText = (s) => b64url(enc.encode(s));
const fromB64url = (s) => atob(s.replace(/-/g, "+").replace(/_/g, "/"));

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
async function sha256Hex(text) {
  const d = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
async function sign(secret, data) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

function loadUsers(env) {
  try { return JSON.parse(env.USERS || "{}"); } catch { return {}; }
}
function getCookie(req, name) {
  const m = (req.headers.get("Cookie") || "").match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? m[1] : null;
}
async function readSession(req, env) {
  const raw = getCookie(req, COOKIE);
  if (!raw || !env.SESSION_SECRET) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig || !safeEqual(sig, await sign(env.SESSION_SECRET, body))) return null;
  try {
    const s = JSON.parse(fromB64url(body));
    if (!s.exp || s.exp < Date.now() / 1000) return null;
    const u = loadUsers(env)[s.u];
    return u ? { username: s.u, name: u.name, role: u.role } : null;
  } catch { return null; }
}
function safeNext(n) {
  return n && n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/login") ? n : "/";
}
function withHeaders(res, extra = {}) {
  const r = new Response(res.body, res);
  r.headers.set("X-Content-Type-Options", "nosniff");
  r.headers.set("Referrer-Policy", "same-origin");
  r.headers.set("X-Frame-Options", "SAMEORIGIN");
  for (const [k, v] of Object.entries(extra)) r.headers.set(k, v);
  return r;
}
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

function loginPage({ error = "", next = "/", username = "", status = 200 }) {
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Sign in · ClaimSure</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{color-scheme:light;--paper:#F5F7FA;--surface:#FFFFFF;--ink:#16233A;--muted:#5A6678;--line:#DCE1E8;--action:#0E6B74;--action-ink:#FFFFFF;--fail:#B3261E;--band:#16233A;--band-ink:#E7ECF3;
box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){color-scheme:dark;--paper:#0F1622;--surface:#172133;--ink:#E7ECF3;--muted:#9AA6B8;--line:#2A3750;--action:#4FB3BC;--action-ink:#0F1622;--fail:#F07A70;--band:#0A1019;--band-ink:#E7ECF3}}
:root[data-theme="dark"]{color-scheme:dark;--paper:#0F1622;--surface:#172133;--ink:#E7ECF3;--muted:#9AA6B8;--line:#2A3750;--action:#4FB3BC;--action-ink:#0F1622;--fail:#F07A70;--band:#0A1019;--band-ink:#E7ECF3}
*,*::before,*::after{box-sizing:inherit}
html,body{height:100%}
body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.5 "IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif;display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr)}
:focus-visible{outline:2px solid var(--action);outline-offset:2px}
.band{border-right:1px solid var(--line);background:var(--band);color:var(--band-ink);padding:48px 44px;display:flex;flex-direction:column;justify-content:space-between;gap:32px}
.brand{font-weight:700;font-size:22px;letter-spacing:-.01em}
.band h1{font-size:30px;line-height:1.2;font-weight:600;margin:0 0 12px;max-width:16ch;letter-spacing:-.015em}
.band p{margin:0;color:#9AA6B8;max-width:38ch}
.steps{list-style:none;margin:0;padding:0;display:grid;gap:10px;font-size:14px;color:#C6CFDB}
.steps li{display:grid;grid-template-columns:22px 1fr;gap:10px}
.steps b{color:#4FB3BC;font-weight:600}
main{display:grid;place-items:center;padding:40px 24px}
form{width:100%;max-width:360px;display:grid;gap:16px}
h2{font-size:22px;margin:0}
.sub{margin:-8px 0 4px;color:var(--muted);font-size:14px}
label{display:grid;gap:6px;font-weight:500;font-size:14px}
input{font:inherit;color:inherit;padding:10px 12px;border:1px solid var(--line);border-radius:6px;background:var(--surface)}
input:focus{border-color:var(--action)}
button{font:inherit;font-weight:600;padding:11px 14px;border-radius:6px;border:1px solid var(--action);background:var(--action);color:var(--action-ink);cursor:pointer}
.err{color:var(--fail);font-size:14px;font-weight:500;margin:0}
.note{font-size:13px;color:var(--muted);margin:0}
@media (max-width:760px){body{grid-template-columns:1fr;grid-template-rows:auto 1fr}.band{padding:28px 22px}.band h1{font-size:24px}.steps{display:none}main{place-items:start center;padding:28px 22px}}
</style></head><body>
<section class="band">
  <div class="brand">ClaimSure</div>
  <div><h1>Audit health-scheme claims with evidence you can stand behind.</h1>
  <p>Desk checks, home visits and audit reports in one place, for PM-JAY, Dr. NTR Vaidya Seva and Aarogyasri claims.</p></div>
  <ol class="steps"><li><b>1</b>Open an assigned case</li><li><b>2</b>Review the automatic document checks</li><li><b>3</b>Record the home visit</li><li><b>4</b>Sign off the audit report</li></ol>
</section>
<main>
  <form method="post" action="/login" autocomplete="on">
    <h2>Sign in</h2>
    <p class="sub">Use the account your audit manager gave you.</p>
    ${error ? `<p class="err" role="alert">${esc(error)}</p>` : ""}
    <input type="hidden" name="next" value="${esc(next)}">
    <label>Username<input name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required value="${esc(username)}" ${username ? "" : "autofocus"}></label>
    <label>Password<input name="password" type="password" autocomplete="current-password" required ${username ? "autofocus" : ""}></label>
    <button type="submit">Sign in</button>
    <p class="note">Demo with made-up patients and hospitals. No real patient data.</p>
  </form>
</main>
<script>
  // Keep the case link (#AP-…) the browser holds, so sign-in returns to that case
  if (location.hash) { const n = document.querySelector('input[name="next"]'); n.value = n.value.split("#")[0] + location.hash; }
</script>
</body></html>`;
  return withHeaders(new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } }), { "Cache-Control": "no-store" });
}

// ---------- Photo evidence API (works once an R2 bucket is bound as PHOTOS) ----------
const SLOT_IDS = new Set(["entrance", "register", "casesheet", "bills", "ward", "patient", "papers", "house", "scar"]);
const CASE_RE = /^AP-\d{4}-\d{3}$/;
const KEY_RE = /^AP-\d{4}-\d{3}\/[a-z]+\/[\w.-]+\.jpg$/;
const json = (data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

async function photosApi(request, env, session, url) {
  const p = url.pathname;
  if (p === "/api/photos/status") return json({ enabled: !!env.PHOTOS });
  if (!env.PHOTOS) return json({ error: "Cloud photo storage isn’t connected yet." }, 503);

  if (p === "/api/photos" && request.method === "GET") {
    const photos = [];
    let cursor;
    do {
      const page = await env.PHOTOS.list({ cursor, include: ["customMetadata"] });
      for (const o of page.objects) {
        try { photos.push(JSON.parse(o.customMetadata.meta)); } catch {}
      }
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
    return json({ photos });
  }

  if (p === "/api/photos" && request.method === "POST") {
    const form = await request.formData();
    const file = form.get("file");
    let meta;
    try { meta = JSON.parse(form.get("meta")); } catch { return json({ error: "Photo details are missing." }, 400); }
    if (!(file instanceof File) || file.type !== "image/jpeg" || file.size > 3_000_000) {
      return json({ error: "Send one JPEG photo under 3 MB." }, 400);
    }
    if (!CASE_RE.test(meta.caseId) || !SLOT_IDS.has(meta.slot) || !/^[a-f0-9]{64}$/.test(meta.hash)) {
      return json({ error: "Photo details are invalid." }, 400);
    }
    const id = `${meta.caseId}/${meta.slot}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.jpg`;
    const record = {
      id, caseId: meta.caseId, slot: meta.slot, hash: meta.hash,
      time: String(meta.time || new Date().toISOString()).slice(0, 40),
      lat: num(meta.lat), lng: num(meta.lng), acc: num(meta.acc),
      auditor: session.name, username: session.username, size: file.size,
      uploaded: new Date().toISOString(),
    };
    await env.PHOTOS.put(id, await file.arrayBuffer(), {
      httpMetadata: { contentType: "image/jpeg" },
      customMetadata: { meta: JSON.stringify(record) },
    });
    return json({ photo: record }, 201);
  }

  const m = p.match(/^\/api\/photos\/file\/(.+)$/);
  if (m) {
    const key = decodeURIComponent(m[1]);
    if (!KEY_RE.test(key)) return json({ error: "Photo not found." }, 404);
    if (request.method === "GET") {
      const obj = await env.PHOTOS.get(key);
      if (!obj) return json({ error: "Photo not found." }, 404);
      return new Response(obj.body, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=3600" } });
    }
    if (request.method === "DELETE") {
      await env.PHOTOS.delete(key);
      return json({ ok: true });
    }
  }
  return json({ error: "Not found." }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/login" && request.method === "GET") {
      if (await readSession(request, env)) return Response.redirect(new URL(safeNext(url.searchParams.get("next")), url), 302);
      return loginPage({ next: safeNext(url.searchParams.get("next")) });
    }

    if (path === "/login" && request.method === "POST") {
      const form = await request.formData();
      const username = String(form.get("username") || "").trim().toLowerCase();
      const password = String(form.get("password") || "");
      const next = safeNext(String(form.get("next") || "/"));
      if (!env.SESSION_SECRET || !env.USERS) {
        return loginPage({ error: "Sign-in isn’t set up yet. Ask the admin to add users.", next, username, status: 503 });
      }
      const user = loadUsers(env)[username];
      const hash = user ? await sha256Hex(user.salt + password) : await sha256Hex("x" + password);
      if (!user || !safeEqual(hash, user.hash)) {
        return loginPage({ error: "Wrong username or password. Check both and try again.", next, username, status: 401 });
      }
      const body = b64urlText(JSON.stringify({ u: username, exp: Math.floor(Date.now() / 1000) + MAX_AGE }));
      const token = `${body}.${await sign(env.SESSION_SECRET, body)}`;
      return new Response(null, {
        status: 303,
        headers: {
          Location: next,
          "Set-Cookie": `${COOKIE}=${token}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
          "Cache-Control": "no-store",
        },
      });
    }

    if (path === "/logout") {
      return new Response(null, {
        status: 303,
        headers: { Location: "/login", "Set-Cookie": `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`, "Cache-Control": "no-store" },
      });
    }

    const session = await readSession(request, env);

    if (path === "/api/me") {
      if (!session) return Response.json({ error: "Not signed in" }, { status: 401, headers: { "Cache-Control": "no-store" } });
      return Response.json(session, { headers: { "Cache-Control": "no-store" } });
    }

    if (path.startsWith("/api/photos")) {
      if (!session) return json({ error: "Not signed in" }, 401);
      return photosApi(request, env, session, url);
    }

    if (!session) {
      const next = path + url.search;
      return Response.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, url), 302);
    }

    const res = await env.ASSETS.fetch(request);
    return withHeaders(res, { "Cache-Control": "private, no-store" });
  },
};
