// FindIt shared module: Supabase client, layout, auth helpers, UI helpers.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
window.__finditReady = true;

/* ------------------------------------------------------------------ */
/* Constants (must match the database CHECK constraints)               */
/* ------------------------------------------------------------------ */
export const CATEGORIES = [
  ["Electronics", "phone"], ["IDs & Cards", "idcard"], ["Bags & Wallets", "bag"], ["Keys", "key"],
  ["Books & Notes", "book"], ["Clothing & Accessories", "shirt"], ["Bottles & Tumblers", "bottle"],
  ["Umbrellas", "umbrella"], ["Others", "box"],
];
export const LOCATIONS = [
  "Main Building", "Library", "Canteen", "Gymnasium", "Covered Court", "Computer Laboratory",
  "Classroom", "Main Gate", "Parking Area", "Restroom", "Other",
];
export const categoryIcon = Object.fromEntries(CATEGORIES);

/* Item photos live in a public Storage bucket, one folder per student. */
export const PHOTO_BUCKET = "report-photos";
export function photoUrl(path) {
  if (!path) return "";
  const safe = String(path).split("/").map(encodeURIComponent).join("/");
  return `${SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${safe}`;
}
function thumbHtml(r, cls = "") {
  const state = r.status === "resolved" ? "resolved" : r.report_type;
  if (r.photo_path) {
    return `<div class="card-thumb has-photo ${cls}"><img src="${esc(photoUrl(r.photo_path))}" alt="Photo of ${esc(r.item_name)}" loading="lazy" decoding="async"></div>`;
  }
  return `<div class="card-thumb ${state} ${cls}" aria-hidden="true">${icon(categoryIcon[r.category] || "box")}</div>`;
}

/* ------------------------------------------------------------------ */
/* Icons (Lucide-style, inline SVG)                                    */
/* ------------------------------------------------------------------ */
const ICONS = {
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  plus: '<circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  tag: '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.8 8.8a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><circle cx="7.5" cy="7.5" r="1"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M16 13H8M16 17H8M10 9H8"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  phone: '<rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/>',
  idcard: '<rect width="20" height="14" x="2" y="5" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 10h4M14 14h4"/>',
  bag: '<path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M8 22v-6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v6M8 10h8"/>',
  key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
  book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
  shirt: '<path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>',
  bottle: '<path d="M10 2h4M10 2v3.2A3 3 0 0 0 8 8v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V8a3 3 0 0 0-2-2.8V2M8 12h8"/>',
  umbrella: '<path d="M22 12a10 10 0 0 0-20 0Z"/><path d="M12 12v8a2 2 0 0 0 4 0M12 2v1"/>',
  box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
  edit: '<path d="M21.17 6.81a1 1 0 0 0-3.98-3.98L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z"/>',
  trash: '<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  reopen: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  user: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  message: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  eye: '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20M9.88 9.88a3 3 0 1 0 4.24 4.24"/>',
  grid: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
  wifiOff: '<path d="M12 20h.01M8.5 16.43a5 5 0 0 1 7 0M2 8.82a15 15 0 0 1 4.17-2.65M10.66 5c4.01-.36 8.14.9 11.34 3.76M16.85 11.25a10 10 0 0 1 2.22 1.68M5 13a10 10 0 0 1 5.24-2.76M2 2l20 20"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
};
export function icon(name, cls = "") {
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ""}</svg>`;
}

/* ------------------------------------------------------------------ */
/* Text helpers                                                        */
/* ------------------------------------------------------------------ */
export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
export function formatDate(isoDate) {
  if (!isoDate) return "";
  const d = new Date(`${String(isoDate).slice(0, 10)}T00:00:00`);
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}
export function timeAgo(ts) {
  const s = Math.max(0, (Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return "just now";
  const units = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [u, sec] of units) {
    const n = Math.floor(s / sec);
    if (n >= 1) return `${n} ${u}${n > 1 ? "s" : ""} ago`;
  }
  return "just now";
}
export function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function firstName(name) { return String(name || "Student").trim().split(/\s+/)[0]; }
export function initials(name) {
  const parts = String(name || "S").trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/* ------------------------------------------------------------------ */
/* Friendly error messages                                             */
/* ------------------------------------------------------------------ */
export function friendlyError(err, context = "general") {
  if (!err) return "Something went wrong. Please try again.";
  const msg = String(err.message || err.error_description || err).toLowerCase();
  const code = String(err.code || "");
  const status = Number(err.status || 0);

  if (!navigator.onLine) return "You appear to be offline. Check your internet connection and try again.";
  if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("load failed") || err.name === "AuthRetryableFetchError")
    return "We couldn't reach the FindIt server. Check your internet connection and try again.";

  // Authentication
  if (code === "invalid_credentials" || msg.includes("invalid login credentials"))
    return "That email and password don't match an account. Check for typos, or register if you're new.";
  if (code === "email_not_confirmed" || msg.includes("email not confirmed"))
    return "Your email isn't confirmed yet. Open the confirmation link we emailed you (check your spam folder too), then log in.";
  if (code === "user_already_exists" || msg.includes("already registered"))
    return "An account with this email already exists. Try logging in instead.";
  if (code === "weak_password" || msg.includes("password should"))
    return "That password is too weak. Use at least 8 characters with a mix of letters and numbers.";
  if (code === "email_address_invalid" || msg.includes("invalid format") || msg.includes("email address") && msg.includes("invalid"))
    return "That email address doesn't look valid. Please check it and try again.";
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || status === 429 || msg.includes("rate limit"))
    return "Too many attempts in a short time. Please wait a minute, then try again.";
  if (code === "signup_disabled") return "New registrations are currently closed.";
  if (code === "session_expired" || code === "PGRST301" || msg.includes("jwt expired") || msg.includes("refresh token"))
    return "Your session has expired. Please log in again.";

  // Photo storage
  if (context === "photo") {
    if (msg.includes("maximum allowed size") || msg.includes("too large") || status === 413)
      return "That photo is still too large after resizing. Try a different photo.";
    if (msg.includes("mime type") || msg.includes("not supported"))
      return "That file type isn't allowed. Use a JPG, PNG, or WebP photo.";
    if (msg.includes("row-level security") || msg.includes("unauthorized") || status === 403)
      return "You can only upload photos while logged in, to your own reports. Please log in again and retry.";
    return "The photo couldn't be uploaded. Check your connection and try again.";
  }

  // Database
  if (code === "42501" || msg.includes("row-level security") || msg.includes("permission denied"))
    return context === "write"
      ? "You don't have permission to do that. You can only change reports you created, and you must be logged in."
      : "You don't have permission to view this. Please log in and try again.";
  if (code === "23514") return "Some details aren't valid. Check each field and try again.";
  if (code === "23503") return "Your account profile is missing. Please log out and log in again.";
  if (code === "22P02") return "That report link isn't valid.";
  if (code === "PGRST116") return "We couldn't find that report. It may have been deleted.";
  if (status >= 500) return "The FindIt server had a problem. Please try again in a moment.";
  return `Something went wrong: ${err.message || "unknown error"}. Please try again.`;
}

/* ------------------------------------------------------------------ */
/* Toasts & flash messages                                             */
/* ------------------------------------------------------------------ */
function toastHost() {
  let host = document.querySelector(".toasts");
  if (!host) {
    host = document.createElement("div");
    host.className = "toasts";
    host.setAttribute("role", "status");
    host.setAttribute("aria-live", "polite");
    document.body.appendChild(host);
  }
  return host;
}
export function toast(message, type = "success", ms = 4500) {
  const el = document.createElement("div");
  el.className = `toast ${type === "error" ? "error" : ""}`;
  el.innerHTML = `${icon(type === "error" ? "alert" : "checkCircle")}<span>${esc(message)}</span><button type="button" aria-label="Dismiss">${icon("x", "icon-sm")}</button>`;
  el.querySelector("button").onclick = () => el.remove();
  toastHost().appendChild(el);
  setTimeout(() => el.remove(), type === "error" ? ms + 3000 : ms);
}
export function setFlash(message, type = "success") {
  try { sessionStorage.setItem("findit.flash", JSON.stringify({ message, type })); } catch {}
}
function showFlash() {
  try {
    const raw = sessionStorage.getItem("findit.flash");
    if (raw) { sessionStorage.removeItem("findit.flash"); const f = JSON.parse(raw); toast(f.message, f.type); }
  } catch {}
}
export function showAlert(el, message, type = "error", title = "") {
  if (!el) return;
  el.className = `alert alert-${type}`;
  el.hidden = false;
  el.setAttribute("role", type === "error" ? "alert" : "status");
  el.innerHTML = `${icon(type === "error" ? "alert" : type === "success" ? "checkCircle" : "message")}<div>${title ? `<strong>${esc(title)}</strong>` : ""}<p>${esc(message)}</p></div>`;
  el.scrollIntoView({ block: "nearest", behavior: "smooth" });
}
export function hideAlert(el) { if (el) { el.hidden = true; el.innerHTML = ""; } }
export function setBusy(btn, busy, label) {
  if (!btn) return;
  if (busy) {
    btn.dataset.label = btn.innerHTML;
    btn.setAttribute("aria-busy", "true");
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner" aria-hidden="true"></span>${esc(label || "Please wait…")}`;
  } else {
    btn.removeAttribute("aria-busy");
    btn.disabled = false;
    if (btn.dataset.label) btn.innerHTML = btn.dataset.label;
  }
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */
let currentSession = null;
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) { console.warn(error); return null; }
  currentSession = data.session;
  return currentSession;
}
export function displayName(user) {
  return user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Student";
}
/** Redirects to the login page when nobody is signed in. Returns the session otherwise. */
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    const next = location.pathname.split("/").pop() + location.search;
    setFlash("Please log in to continue.", "error");
    location.replace(`login.html?next=${encodeURIComponent(next || "dashboard.html")}`);
    return new Promise(() => {}); // halt the page script
  }
  return session;
}
/** Only allow redirects to our own pages (prevents open-redirect abuse). */
export function safeNext(raw, fallback = "dashboard.html") {
  if (!raw) return fallback;
  return /^[a-z-]+\.html(\?[\w=&%.-]*)?$/i.test(raw) ? raw : fallback;
}
export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    // Clear the local session anyway so the device is signed out.
    await supabase.auth.signOut({ scope: "local" });
  }
  setFlash("You've been logged out. See you around campus!");
  location.href = "index.html";
}

/* ------------------------------------------------------------------ */
/* Layout: header + footer                                             */
/* ------------------------------------------------------------------ */
const NAV = [
  ["index.html", "Browse"],
  ["my-reports.html", "My Reports"],
  ["dashboard.html", "Dashboard"],
];
function currentPage() {
  const p = location.pathname.split("/").pop();
  return p === "" ? "index.html" : p;
}
function renderHeader(session) {
  const host = document.getElementById("site-header");
  if (!host) return;
  const page = currentPage();
  const user = session?.user;
  const name = displayName(user);
  host.className = "site-header";
  host.innerHTML = `
    <div class="container header-inner">
      <a class="brand" href="index.html" aria-label="FindIt home">
        <img src="assets/pnc-seal-128.png" alt="" width="44" height="44">
        <span><span class="brand-name">Find<span>It</span></span><span class="brand-sub">Pamantasan ng Cabuyao · Lost &amp; Found</span></span>
      </a>
      <button class="btn btn-ghost btn-icon menu-toggle" type="button" aria-expanded="false" aria-controls="main-nav" aria-label="Open menu">${icon("menu")}</button>
      <nav class="main-nav" id="main-nav" aria-label="Main">
        ${NAV.map(([href, label]) => `<a class="nav-link" href="${href}" ${page === href ? 'aria-current="page"' : ""}>${label}</a>`).join("")}
        <div class="nav-auth">
          ${user ? `
            <span class="user-chip" title="${esc(user.email)}"><span class="avatar" aria-hidden="true">${esc(initials(name))}</span><span>${esc(firstName(name))}</span></span>
            <button class="btn btn-sm" type="button" data-logout>${icon("logout", "icon-sm")}Log out</button>`
          : `
            <a class="btn btn-sm btn-ghost" href="login.html">Log in</a>
            <a class="btn btn-sm btn-primary" href="register.html">Register</a>`}
        </div>
      </nav>
    </div>`;
  const toggle = host.querySelector(".menu-toggle");
  const nav = host.querySelector(".main-nav");
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    toggle.innerHTML = icon(open ? "x" : "menu");
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && nav.classList.contains("open")) toggle.click(); });
  host.querySelector("[data-logout]")?.addEventListener("click", async (e) => {
    setBusy(e.currentTarget, true, "Logging out…");
    await logout();
  });
}
function renderFooter() {
  const host = document.getElementById("site-footer");
  if (!host) return;
  host.className = "site-footer";
  host.innerHTML = `
    <div class="container footer-inner">
      <div class="footer-brand">
        <img src="assets/pnc-seal-128.png" alt="Pamantasan ng Cabuyao seal" width="56" height="56">
        <div>
          <strong>FindIt</strong>
          School Lost &amp; Found for the Pamantasan ng Cabuyao community.
          <span class="motto">Dangal ng Bayan</span>
        </div>
      </div>
      <div>
        <h3>Get started</h3>
        <ul>
          <li><a href="index.html#browse">Browse reports</a></li>
          <li><a href="report.html?type=lost">Report a lost item</a></li>
          <li><a href="report.html?type=found">Report a found item</a></li>
        </ul>
      </div>
      <div>
        <h3>Your account</h3>
        <ul>
          <li><a href="dashboard.html">Dashboard</a></li>
          <li><a href="my-reports.html">My Reports</a></li>
          <li><a href="privacy.html">Privacy Policy</a></li>
        </ul>
      </div>
    </div>
    <div class="container footer-bottom">
      FindIt is a CPP123 student project by Manaig, Rheynalyn M. (2CPE-B). It is not an official service of Pamantasan ng Cabuyao.
    </div>`;
}

/** Call once per page. Renders header/footer and returns the current session. */
export async function initPage() {
  renderFooter();
  const session = await getSession();
  renderHeader(session);
  showFlash();
  supabase.auth.onAuthStateChange((event, s) => {
    if (event === "SIGNED_OUT" || event === "SIGNED_IN" || event === "USER_UPDATED") {
      const changed = (s?.user?.id || null) !== (currentSession?.user?.id || null);
      currentSession = s;
      renderHeader(s);
      if (changed && document.body.dataset.protected === "true" && !s) {
        setFlash("You were signed out. Please log in again.", "error");
        location.replace("login.html");
      }
    }
  });
  return session;
}

/* ------------------------------------------------------------------ */
/* Report rendering                                                    */
/* ------------------------------------------------------------------ */
export function badgeFor(r) {
  const type = r.report_type === "lost"
    ? `<span class="badge badge-lost">${icon("search")}Lost</span>`
    : `<span class="badge badge-found">${icon("check")}Found</span>`;
  const status = r.status === "resolved"
    ? `<span class="badge badge-resolved">${icon("checkCircle")}Resolved</span>`
    : "";
  return type + status;
}
export function locationText(r) {
  return r.location_detail ? `${r.location} · ${r.location_detail}` : r.location;
}
/**
 * Renders a report card.
 * opts.mine  – show owner actions (edit / resolve / reopen / delete)
 * opts.userId – current user id, to label "Yours"
 */
export function reportCard(r, opts = {}) {
  const resolved = r.status === "resolved";
  const isMine = opts.userId && r.user_id === opts.userId;
  const reporter = r.profiles?.full_name ? `by ${esc(firstName(r.profiles.full_name))} · ` : "";
  return `
  <article class="card ${resolved ? "resolved" : ""} ${opts.mine ? "" : "is-clickable"}" data-id="${esc(r.id)}">
    <div class="card-body">
      ${thumbHtml(r)}
      <div class="card-main">
        <div class="badges">${badgeFor(r)}${isMine && !opts.mine ? '<span class="badge badge-mine">Yours</span>' : ""}</div>
        <h3 class="card-title">${opts.mine ? esc(r.item_name) : `<a href="#report-${esc(r.id)}" data-open="${esc(r.id)}">${esc(r.item_name)}</a>`}</h3>
        <ul class="meta">
          <li>${icon("tag")}<span>${esc(r.category)}</span></li>
          <li>${icon("pin")}<span>${esc(locationText(r))}</span></li>
          <li>${icon("calendar")}<span>${r.report_type === "lost" ? "Lost on" : "Found on"} ${esc(formatDate(r.item_date))}</span></li>
        </ul>
        <p class="card-desc">${esc(r.description)}</p>
      </div>
    </div>
    <div class="card-foot">
      <span>${reporter}Posted ${esc(timeAgo(r.created_at))}</span>
      ${opts.mine ? `
      <div class="card-actions">
        <a class="btn btn-sm" href="report.html?id=${encodeURIComponent(r.id)}" aria-label="Edit ${esc(r.item_name)}">${icon("edit", "icon-sm")}Edit</a>
        ${resolved
          ? `<button class="btn btn-sm" type="button" data-action="reopen" data-id="${esc(r.id)}">${icon("reopen", "icon-sm")}Reopen</button>`
          : `<button class="btn btn-sm btn-primary" type="button" data-action="resolve" data-id="${esc(r.id)}">${icon("checkCircle", "icon-sm")}Mark resolved</button>`}
        <button class="btn btn-sm btn-danger-outline" type="button" data-action="delete" data-id="${esc(r.id)}" aria-label="Delete ${esc(r.item_name)}">${icon("trash", "icon-sm")}Delete</button>
      </div>` : `<span class="text-muted">${icon("chevron", "icon-sm")}</span>`}
    </div>
  </article>`;
}
export function skeletonCards(n = 6) {
  return Array.from({ length: n }, () => `
  <div class="card skeleton" aria-hidden="true"><div class="card-body">
    <div class="card-thumb sk"></div>
    <div class="card-main"><div class="sk sk-badge"></div><div class="sk sk-title"></div>
    <div class="sk sk-line"></div><div class="sk sk-line short"></div><div class="sk sk-line long"></div></div>
  </div></div>`).join("");
}
export function stateBlock({ iconName = "inbox", title, text, action = "", error = false }) {
  return `<div class="state ${error ? "error" : ""}" ${error ? 'role="alert"' : ""}>
    <div class="state-icon">${icon(iconName, "icon-lg")}</div>
    <h3>${esc(title)}</h3><p>${esc(text)}</p>${action}</div>`;
}

/* ------------------------------------------------------------------ */
/* Report detail dialog                                                */
/* ------------------------------------------------------------------ */
export async function openReportDialog(report, session) {
  let dlg = document.getElementById("report-dialog");
  if (!dlg) {
    dlg = document.createElement("dialog");
    dlg.id = "report-dialog";
    dlg.setAttribute("aria-labelledby", "rd-title");
    document.body.appendChild(dlg);
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("close", () => { if (location.hash.startsWith("#report-")) history.replaceState(null, "", location.pathname + location.search); });
  }
  const r = report;
  const mine = session && session.user.id === r.user_id;
  dlg.innerHTML = `
    <div class="dialog-head">
      <div class="card-thumb ${r.status === "resolved" ? "resolved" : r.report_type}" aria-hidden="true">${icon(categoryIcon[r.category] || "box")}</div>
      <div class="dialog-title"><div class="badges">${badgeFor(r)}</div><h2 id="rd-title">${esc(r.item_name)}</h2></div>
      <button class="btn btn-ghost btn-icon dialog-close" type="button" aria-label="Close" data-close>${icon("x")}</button>
    </div>
    <div class="dialog-body">
      ${r.photo_path ? `<figure class="detail-photo"><img src="${esc(photoUrl(r.photo_path))}" alt="Photo of ${esc(r.item_name)}"></figure>` : ""}
      <dl class="detail-list">
        <dt>${icon("tag", "icon-sm")}Category</dt><dd>${esc(r.category)}</dd>
        <dt>${icon("pin", "icon-sm")}Location</dt><dd>${esc(locationText(r))}</dd>
        <dt>${icon("calendar", "icon-sm")}${r.report_type === "lost" ? "Date lost" : "Date found"}</dt><dd>${esc(formatDate(r.item_date))}</dd>
        <dt>${icon("clock", "icon-sm")}Posted</dt><dd>${esc(timeAgo(r.created_at))}${r.profiles?.full_name ? ` by ${esc(r.profiles.full_name)}` : ""}</dd>
      </dl>
      <p class="desc">${esc(r.description)}</p>
      <div id="rd-contact"></div>
    </div>
    <div class="dialog-foot">
      ${mine ? `<a class="btn btn-primary" href="report.html?id=${encodeURIComponent(r.id)}">${icon("edit", "icon-sm")}Edit report</a>` : ""}
      <button class="btn" type="button" data-close>Close</button>
    </div>`;
  dlg.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => dlg.close()));
  dlg.showModal();

  const box = dlg.querySelector("#rd-contact");
  if (!session) {
    box.innerHTML = `<div class="contact-box locked">${icon("shield", "icon-sm")} <a href="login.html?next=${encodeURIComponent("index.html")}">Log in</a> to see how to reach the person who posted this.</div>`;
    return;
  }
  box.innerHTML = `<div class="contact-box locked">Loading contact details…</div>`;
  const { data, error } = await supabase.from("report_contacts").select("contact").eq("report_id", r.id).maybeSingle();
  if (error) box.innerHTML = `<div class="contact-box locked">${esc(friendlyError(error))}</div>`;
  else if (data?.contact) box.innerHTML = `<div class="contact-box"><strong>How to reach the reporter:</strong><br>${esc(data.contact)}</div>`;
  else box.innerHTML = `<div class="contact-box locked">The reporter didn't leave contact details. ${r.report_type === "found" ? "Check with the campus guard house or your college office." : "If you found this item, consider posting a found report."}</div>`;
}

/** The select string for reports: signed-in students also get the reporter's name. */
export function reportSelect(session) {
  return session ? "*, profiles(full_name)" : "*";
}

/* Boot-failure fallback: if this module never loads, the inline script in each page shows a message. */
