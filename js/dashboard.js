import {
  supabase, initPage, requireAuth, reportCard, skeletonCards, stateBlock, friendlyError,
  openReportDialog, displayName, firstName, reportSelect, esc, formatDate,
} from "./common.js";
import { handleReportAction } from "./report-actions.js";

const mineEl = document.getElementById("mine");
const foundEl = document.getElementById("found");
let mine = [];
let found = [];
let matchPool = [];
const matchesEl = document.getElementById("matches");
const matchesSection = document.getElementById("matches-section");

const DAY = 86400000;
const toDay = (d) => new Date(`${d}T00:00:00`).getTime();

/** Found reports (not mine, still open) in the same category, dated from 3 days
 *  before the loss to 45 days after it. Same-location items rank first. */
async function loadMatches(myReports) {
  const lost = myReports.filter((r) => r.report_type === "lost" && r.status === "open");
  if (!lost.length) { matchesSection.hidden = true; return; }
  const cats = [...new Set(lost.map((r) => r.category))];
  const earliest = new Date(Math.min(...lost.map((r) => toDay(r.item_date))) - 3 * DAY);
  const since = `${earliest.getFullYear()}-${String(earliest.getMonth() + 1).padStart(2, "0")}-${String(earliest.getDate()).padStart(2, "0")}`;
  const { data, error } = await supabase.from("reports").select(reportSelect(session))
    .eq("report_type", "found").eq("status", "open").neq("user_id", uid)
    .in("category", cats).gte("item_date", since)
    .order("created_at", { ascending: false }).limit(100);
  matchesSection.hidden = false;
  if (error) {
    matchesEl.innerHTML = stateBlock({ iconName: "wifiOff", error: true, title: "Couldn't check for matches", text: friendlyError(error) });
    return;
  }
  matchPool = data;
  const groups = lost.map((l) => {
    const lt = toDay(l.item_date);
    const hits = data
      .filter((f) => f.category === l.category && toDay(f.item_date) >= lt - 3 * DAY && toDay(f.item_date) <= lt + 45 * DAY)
      .sort((a, b) => (b.location === l.location) - (a.location === l.location) || Math.abs(toDay(a.item_date) - lt) - Math.abs(toDay(b.item_date) - lt))
      .slice(0, 3);
    return { l, hits };
  });
  const total = groups.reduce((n, g) => n + g.hits.length, 0);
  if (!total) {
    matchesEl.innerHTML = stateBlock({ iconName: "search", title: "No matches yet", text: "No one has posted a found item like yours so far. We'll show it here as soon as one appears." });
    return;
  }
  matchesEl.innerHTML = groups.filter((g) => g.hits.length).map(({ l, hits }) => `
    <div class="match-group">
      <h3>Your lost ${esc(l.item_name)}</h3>
      <p>${esc(l.category)} · lost ${esc(formatDate(l.item_date))} at ${esc(l.location)} — ${hits.length} possible match${hits.length > 1 ? "es" : ""}${hits.some((h) => h.location === l.location) ? (hits.length === 1 ? ", found at the same place" : ", including one found at the same place") : ""}</p>
      <div class="list-cards">${hits.map((h) => reportCard(h, { userId: uid })).join("")}</div>
    </div>`).join("");
}
matchesEl.addEventListener("click", (e) => {
  const card = e.target.closest(".card.is-clickable");
  if (!card) return;
  e.preventDefault();
  const r = matchPool.find((x) => x.id === card.dataset.id);
  if (r) openReportDialog(r, session);
});

await initPage();
const session = await requireAuth();
const uid = session.user.id;

const hour = new Date().getHours();
const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
document.getElementById("welcome-title").textContent = `${greet}, ${firstName(displayName(session.user))}!`;

async function loadMine() {
  mineEl.innerHTML = mine.length ? mineEl.innerHTML : skeletonCards(2);
  const { data, error } = await supabase.from("reports").select("*").eq("user_id", uid).order("created_at", { ascending: false });
  mineEl.setAttribute("aria-busy", "false");
  if (error) {
    mineEl.innerHTML = stateBlock({ iconName: "wifiOff", error: true, title: "Couldn't load your reports", text: friendlyError(error) });
    ["m-lost", "m-found", "m-resolved"].forEach((id) => (document.getElementById(id).textContent = "!"));
    return;
  }
  mine = data;
  loadMatches(data);
  const open = data.filter((r) => r.status === "open");
  document.getElementById("m-lost").textContent = open.filter((r) => r.report_type === "lost").length;
  document.getElementById("m-found").textContent = open.filter((r) => r.report_type === "found").length;
  document.getElementById("m-resolved").textContent = data.length - open.length;
  document.getElementById("welcome-sub").textContent = data.length
    ? `You have ${open.length} open report${open.length === 1 ? "" : "s"}. Mark them resolved once items are back home.`
    : "You haven't posted anything yet. Lost or found something? Start here.";
  mineEl.innerHTML = data.length
    ? data.slice(0, 3).map((r) => reportCard(r, { mine: true, userId: uid })).join("")
    : stateBlock({ iconName: "file", title: "No reports yet", text: "Your reports will appear here.", action: '<a class="btn btn-primary" href="report.html">Post your first report</a>' });
}

async function loadFound() {
  foundEl.innerHTML = skeletonCards(2);
  const [{ data, error }, stats] = await Promise.all([
    supabase.from("reports").select(reportSelect(session)).eq("report_type", "found").eq("status", "open").neq("user_id", uid).order("created_at", { ascending: false }).limit(3),
    supabase.rpc("report_stats"),
  ]);
  foundEl.setAttribute("aria-busy", "false");
  const s = Array.isArray(stats.data) ? stats.data[0] : stats.data;
  document.getElementById("m-campus").textContent = stats.error ? "!" : Number(s?.open_count || 0).toLocaleString("en-PH");
  if (error) {
    foundEl.innerHTML = stateBlock({ iconName: "wifiOff", error: true, title: "Couldn't load found items", text: friendlyError(error) });
    return;
  }
  found = data;
  foundEl.innerHTML = data.length
    ? data.map((r) => reportCard(r, { userId: uid })).join("")
    : stateBlock({ iconName: "inbox", title: "Nothing new right now", text: "No open found reports from other students. Check back later." });
}

mineEl.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (btn && (await handleReportAction(btn, mine))) loadMine();
});
foundEl.addEventListener("click", (e) => {
  const card = e.target.closest(".card.is-clickable");
  if (!card) return;
  e.preventDefault();
  const r = found.find((x) => x.id === card.dataset.id);
  if (r) openReportDialog(r, session);
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") { loadMine(); loadFound(); }
});

loadMine();
loadFound();
