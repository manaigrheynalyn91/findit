import {
  supabase, initPage, requireAuth, reportCard, skeletonCards, stateBlock, friendlyError,
  openReportDialog, displayName, firstName, reportSelect,
} from "./common.js";
import { handleReportAction } from "./report-actions.js";

const mineEl = document.getElementById("mine");
const foundEl = document.getElementById("found");
let mine = [];
let found = [];

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
