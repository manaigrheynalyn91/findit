import {
  supabase, initPage, CATEGORIES, LOCATIONS, reportCard, skeletonCards, stateBlock,
  friendlyError, openReportDialog, reportSelect, icon, esc,
} from "./common.js";

const PAGE_SIZE = 12;
const els = {
  form: document.getElementById("filters"),
  q: document.getElementById("q"),
  category: document.getElementById("category"),
  location: document.getElementById("location"),
  status: document.getElementById("status"),
  typeBtns: document.querySelectorAll("[data-type]"),
  results: document.getElementById("results"),
  count: document.getElementById("result-count"),
  more: document.getElementById("load-more"),
  clear: document.getElementById("clear-filters"),
};

let session = null;
let filters = { q: "", category: "", location: "", status: "", type: "" };
let page = 0;
let loaded = [];
let requestId = 0;

// ---------- populate selects ----------
for (const [c] of CATEGORIES) els.category.add(new Option(c, c));
for (const l of LOCATIONS) els.location.add(new Option(l, l));

// ---------- read filters from URL (so filtered views can be shared / bookmarked) ----------
const params = new URLSearchParams(location.search);
filters.q = (params.get("q") || "").slice(0, 60);
filters.category = CATEGORIES.some(([c]) => c === params.get("category")) ? params.get("category") : "";
filters.location = LOCATIONS.includes(params.get("location")) ? params.get("location") : "";
filters.status = ["open", "resolved"].includes(params.get("status")) ? params.get("status") : "";
filters.type = ["lost", "found"].includes(params.get("type")) ? params.get("type") : "";
els.q.value = filters.q;
els.category.value = filters.category;
els.location.value = filters.location;
els.status.value = filters.status;
syncTypeButtons();

function syncTypeButtons() {
  els.typeBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.type === filters.type)));
}
function syncUrl() {
  const p = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => v && p.set(k, v));
  const qs = p.toString();
  history.replaceState(null, "", `${location.pathname}${qs ? `?${qs}` : ""}${location.hash}`);
  els.clear.hidden = !qs;
}
function hasFilters() { return Object.values(filters).some(Boolean); }

// ---------- stats ----------
async function loadStats() {
  const { data, error } = await supabase.rpc("report_stats");
  const fmt = (n) => Number(n || 0).toLocaleString("en-PH");
  if (error) {
    ["stat-open", "stat-resolved", "stat-total"].forEach((id) => (document.getElementById(id).textContent = "!"));
    document.getElementById("hero-resolved").textContent = "Many";
    console.warn(error);
    return;
  }
  const s = Array.isArray(data) ? data[0] : data;
  document.getElementById("stat-open").textContent = fmt(s?.open_count);
  document.getElementById("stat-resolved").textContent = fmt(s?.resolved_count);
  document.getElementById("stat-total").textContent = fmt(s?.total_count);
  document.getElementById("hero-resolved").textContent = fmt(s?.resolved_count);
}

// ---------- reports ----------
function buildQuery(from, to) {
  let q = supabase
    .from("reports")
    .select(reportSelect(session), { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (filters.type) q = q.eq("report_type", filters.type);
  if (filters.category) q = q.eq("category", filters.category);
  if (filters.location) q = q.eq("location", filters.location);
  if (filters.status) q = q.eq("status", filters.status);
  // Each word must appear in the name, description, or location detail.
  const words = filters.q.replace(/[^\p{L}\p{N}\s'-]/gu, " ").trim().split(/\s+/).filter(Boolean).slice(0, 5);
  for (const w of words) {
    q = q.or(`item_name.ilike."%${w}%",description.ilike."%${w}%",location_detail.ilike."%${w}%"`);
  }
  return q;
}

async function loadReports({ append = false } = {}) {
  const myId = ++requestId;
  if (!append) {
    page = 0;
    loaded = [];
    els.results.setAttribute("aria-busy", "true");
    els.results.innerHTML = skeletonCards(6);
    els.more.hidden = true;
  } else {
    els.more.disabled = true;
    els.more.textContent = "Loading…";
  }
  const from = page * PAGE_SIZE;
  const { data, error, count } = await buildQuery(from, from + PAGE_SIZE - 1);
  if (myId !== requestId) return; // a newer search started; ignore this result

  els.results.setAttribute("aria-busy", "false");
  els.more.disabled = false;
  els.more.textContent = "Load more reports";

  if (error) {
    els.count.textContent = "";
    els.results.innerHTML = stateBlock({
      iconName: "wifiOff", error: true, title: "We couldn't load reports",
      text: friendlyError(error),
      action: '<button class="btn btn-primary" type="button" data-retry>Try again</button>',
    });
    els.results.querySelector("[data-retry]").onclick = () => loadReports();
    return;
  }

  loaded = append ? loaded.concat(data) : data;
  page += 1;
  const html = data.map((r) => reportCard(r, { userId: session?.user.id })).join("");
  if (append) els.results.insertAdjacentHTML("beforeend", html);
  else els.results.innerHTML = html;

  if (!loaded.length) {
    els.results.innerHTML = hasFilters()
      ? stateBlock({ iconName: "search", title: "No matching reports", text: "Try a different word, or clear some filters to see more items.", action: '<button class="btn" type="button" data-clear>Clear filters</button>' })
      : stateBlock({ iconName: "inbox", title: "No reports yet", text: "Be the first to help — post something you lost or found on campus.", action: '<a class="btn btn-primary" href="report.html?type=found">Report a found item</a>' });
    els.results.querySelector("[data-clear]")?.addEventListener("click", clearFilters);
  }
  els.count.textContent = count === 1 ? "1 report" : `${(count ?? 0).toLocaleString("en-PH")} reports`;
  els.more.hidden = loaded.length >= (count ?? 0);
}

function clearFilters() {
  filters = { q: "", category: "", location: "", status: "", type: "" };
  els.form.reset();
  syncTypeButtons();
  syncUrl();
  loadReports();
}

// ---------- events ----------
let debounce;
els.q.addEventListener("input", () => {
  clearTimeout(debounce);
  debounce = setTimeout(() => { filters.q = els.q.value.trim().slice(0, 60); syncUrl(); loadReports(); }, 300);
});
els.form.addEventListener("submit", (e) => { e.preventDefault(); clearTimeout(debounce); filters.q = els.q.value.trim(); syncUrl(); loadReports(); });
for (const key of ["category", "location", "status"]) {
  els[key].addEventListener("change", () => { filters[key] = els[key].value; syncUrl(); loadReports(); });
}
els.typeBtns.forEach((b) => b.addEventListener("click", () => {
  filters.type = b.dataset.type; syncTypeButtons(); syncUrl(); loadReports();
}));
els.clear.addEventListener("click", clearFilters);
els.more.addEventListener("click", () => loadReports({ append: true }));

els.results.addEventListener("click", (e) => {
  const link = e.target.closest("[data-open]");
  const card = e.target.closest(".card.is-clickable");
  if (!card) return;
  e.preventDefault();
  const r = loaded.find((x) => x.id === (link?.dataset.open || card.dataset.id));
  if (r) { history.replaceState(null, "", `${location.pathname}${location.search}#report-${r.id}`); openReportDialog(r, session); }
});

// Open a report directly from a shared link: index.html#report-<id>
async function openFromHash() {
  const m = location.hash.match(/^#report-([0-9a-f-]{36})$/i);
  if (!m) return;
  const { data, error } = await supabase.from("reports").select(reportSelect(session)).eq("id", m[1]).maybeSingle();
  if (data) openReportDialog(data, session);
  else if (error) console.warn(error);
}

// Refresh when coming back to the tab, so reports made on other devices show up.
let lastLoad = Date.now();
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && Date.now() - lastLoad > 30000) {
    lastLoad = Date.now(); loadStats(); loadReports();
  }
});

// ---------- start ----------
session = await initPage();
syncUrl();
loadStats();
await loadReports();
openFromHash();
