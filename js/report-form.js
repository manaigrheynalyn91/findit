import {
  supabase, initPage, requireAuth, CATEGORIES, LOCATIONS, friendlyError, showAlert, hideAlert,
  setBusy, setFlash, todayLocal, icon,
} from "./common.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const form = document.getElementById("report-form");
const alertBox = document.getElementById("form-alert");
const loading = document.getElementById("loading");
const submit = document.getElementById("submit");
const params = new URLSearchParams(location.search);
const editId = params.get("id");
let existingContact = null;

for (const [c] of CATEGORIES) form.category.add(new Option(c, c));
for (const l of LOCATIONS) form.location.add(new Option(l, l));
form.item_date.max = todayLocal();
form.item_date.min = "2020-01-01";

const descCount = document.getElementById("desc-count");
const updateCount = () => (descCount.textContent = `${form.description.value.length} / 600`);
form.description.addEventListener("input", updateCount);

function updateTypeText() {
  const t = form.report_type.value;
  document.getElementById("date-label").firstChild.textContent = t === "found" ? "Date found " : t === "lost" ? "Date lost " : "Date ";
}
form.querySelectorAll("input[name=report_type]").forEach((r) => r.addEventListener("change", updateTypeText));

function setError(id, message) {
  const out = document.getElementById(`${id}-error`);
  const input = form.elements[id];
  if (input?.setAttribute && !(input instanceof RadioNodeList)) {
    if (message) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
  }
  out.innerHTML = message ? `${icon("alert", "icon-sm")}${message}` : "";
  return !message;
}

function readForm() {
  const clean = (s) => s.trim().replace(/\s+/g, " ");
  return {
    report_type: form.report_type.value,
    item_name: clean(form.item_name.value),
    category: form.category.value,
    location: form.location.value,
    location_detail: clean(form.location_detail.value) || null,
    item_date: form.item_date.value,
    description: form.description.value.trim(),
    contact: clean(form.contact.value),
  };
}

function validate(v) {
  const today = todayLocal();
  const checks = [
    setError("report_type", !["lost", "found"].includes(v.report_type) ? "Choose whether you lost or found the item." : ""),
    setError("item_name", v.item_name.length < 2 ? "Enter the item name (at least 2 characters)." : ""),
    setError("category", !v.category ? "Choose a category." : ""),
    setError("location", !v.location ? "Choose where it was lost or found." : ""),
    setError("location_detail", ""),
    setError("item_date", !v.item_date ? "Pick a date." : v.item_date > today ? "The date can't be in the future." : v.item_date < "2020-01-01" ? "Pick a more recent date." : ""),
    setError("description", v.description.length < 5 ? "Add a short description (at least 5 characters)." : ""),
    setError("contact", v.contact && v.contact.length < 3 ? "Contact details are too short — or leave this blank." : ""),
  ];
  return checks.every(Boolean);
}

function fill(r) {
  form.querySelector(`input[name=report_type][value=${r.report_type}]`).checked = true;
  form.item_name.value = r.item_name;
  form.category.value = r.category;
  form.location.value = r.location;
  form.location_detail.value = r.location_detail || "";
  form.item_date.value = r.item_date;
  form.description.value = r.description;
  updateCount();
  updateTypeText();
}

function showBlocked(title, message) {
  loading.hidden = true;
  form.hidden = true;
  showAlert(alertBox, message, "error", title);
  alertBox.insertAdjacentHTML("afterend", `<p class="mt-2"><a class="btn" href="my-reports.html">Back to My Reports</a></p>`);
}

// ---------- start ----------
await initPage();
const session = await requireAuth();

if (editId) {
  document.title = "Edit report — FindIt";
  document.getElementById("page-title").textContent = "Edit report";
  document.getElementById("crumb").textContent = "Edit";
  document.getElementById("page-intro").textContent = "Update the details so they stay accurate.";
  submit.textContent = "Save changes";

  if (!UUID_RE.test(editId)) {
    showBlocked("Report not found", "That report link isn't valid.");
  } else {
    const { data: r, error } = await supabase.from("reports").select("*").eq("id", editId).maybeSingle();
    if (error) showBlocked("Couldn't load the report", friendlyError(error));
    else if (!r) showBlocked("Report not found", "This report doesn't exist or was deleted.");
    else if (r.user_id !== session.user.id) showBlocked("You can't edit this report", "Only the student who posted a report can edit it. You can still view it on the Browse page.");
    else {
      fill(r);
      const { data: c } = await supabase.from("report_contacts").select("contact").eq("report_id", r.id).maybeSingle();
      existingContact = c?.contact || null;
      form.contact.value = existingContact || "";
      loading.hidden = true;
      form.hidden = false;
    }
  }
} else {
  const t = params.get("type");
  if (t === "lost" || t === "found") form.querySelector(`input[name=report_type][value=${t}]`).checked = true;
  form.item_date.value = todayLocal();
  updateTypeText();
  loading.hidden = true;
  form.hidden = false;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert(alertBox);
  const v = readForm();
  if (!validate(v)) {
    (form.querySelector("[aria-invalid='true']") || form.querySelector("input[name=report_type]"))?.focus();
    return;
  }
  const { contact, ...report } = v;
  setBusy(submit, true, editId ? "Saving…" : "Posting…");

  try {
    let reportId = editId;
    if (editId) {
      const { data, error } = await supabase.from("reports").update(report).eq("id", editId).select("id");
      if (error) throw error;
      if (!data?.length) throw { code: "42501", message: "No rows updated (not owner)" };
    } else {
      const { data, error } = await supabase.from("reports").insert(report).select("id").single();
      if (error) throw error;
      reportId = data.id;
    }

    // Optional contact note, stored separately so only signed-in students can read it.
    let contactWarning = "";
    if (contact) {
      const { error } = await supabase.from("report_contacts").upsert({ report_id: reportId, contact }, { onConflict: "report_id" });
      if (error) contactWarning = " Your contact details couldn't be saved, though — edit the report to try again.";
    } else if (existingContact) {
      await supabase.from("report_contacts").delete().eq("report_id", reportId);
    }

    setFlash((editId ? "Changes saved." : `Your ${report.report_type} report is posted.`) + contactWarning, contactWarning ? "error" : "success");
    location.href = "my-reports.html";
  } catch (err) {
    showAlert(alertBox, friendlyError(err, "write"), "error", editId ? "Couldn't save your changes" : "Couldn't post your report");
    setBusy(submit, false);
  }
});
