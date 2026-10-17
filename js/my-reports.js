import { supabase, initPage, requireAuth, reportCard, skeletonCards, stateBlock, friendlyError } from "./common.js";
import { handleReportAction } from "./report-actions.js";

const results = document.getElementById("results");
const countEl = document.getElementById("result-count");
let reports = [];
let filter = { status: "", type: "" };

await initPage();
const session = await requireAuth();

async function load() {
  results.setAttribute("aria-busy", "true");
  if (!reports.length) results.innerHTML = skeletonCards(3);
  // Fetch only this student's reports; RLS would block changes to others anyway.
  const { data, error } = await supabase
    .from("reports").select("*")
    .eq("user_id", session.user.id)
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });
  results.setAttribute("aria-busy", "false");
  if (error) {
    results.innerHTML = stateBlock({ iconName: "wifiOff", error: true, title: "We couldn't load your reports", text: friendlyError(error), action: '<button class="btn btn-primary" type="button" data-retry>Try again</button>' });
    results.querySelector("[data-retry]").onclick = load;
    countEl.textContent = "";
    return;
  }
  reports = data;
  render();
}

function render() {
  const list = reports.filter((r) => (!filter.status || r.status === filter.status) && (!filter.type || r.report_type === filter.type));
  const open = reports.filter((r) => r.status === "open").length;
  countEl.textContent = reports.length
    ? `${list.length} shown · ${open} open · ${reports.length - open} resolved`
    : "";
  if (!reports.length) {
    results.innerHTML = stateBlock({
      iconName: "file", title: "You haven't posted any reports yet",
      text: "Lost something, or picked up something that isn't yours? Post it so the campus can help.",
      action: '<a class="btn btn-primary" href="report.html?type=lost">Report a lost item</a> <a class="btn btn-gold" href="report.html?type=found">Report a found item</a>',
    });
    return;
  }
  results.innerHTML = list.length
    ? list.map((r) => reportCard(r, { mine: true, userId: session.user.id })).join("")
    : stateBlock({ iconName: "search", title: "Nothing here", text: "No reports match this filter." });
}

document.querySelectorAll("[data-status]").forEach((b) => b.addEventListener("click", () => {
  filter.status = b.dataset.status;
  document.querySelectorAll("[data-status]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  render();
}));
document.querySelectorAll("[data-type]").forEach((b) => b.addEventListener("click", () => {
  filter.type = b.dataset.type;
  document.querySelectorAll("[data-type]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  render();
}));

results.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  if (await handleReportAction(btn, reports)) await load();
});

document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") load(); });

load();
