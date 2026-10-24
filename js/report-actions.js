// Owner actions: resolve, reopen, delete. Row-level security on the server
// enforces ownership; these checks just give clear feedback in the UI.
import { supabase, friendlyError, toast, esc, icon } from "./common.js";
import { deletePhoto } from "./photo.js";

function confirmDelete(name) {
  return new Promise((resolve) => {
    const dlg = document.createElement("dialog");
    dlg.setAttribute("aria-labelledby", "del-title");
    dlg.innerHTML = `
      <div class="dialog-head">
        <div class="card-thumb lost" aria-hidden="true">${icon("trash")}</div>
        <div><h2 id="del-title">Delete this report?</h2><p class="text-muted mt-0">“${esc(name)}” will be removed for everyone. This can't be undone.</p></div>
      </div>
      <div class="dialog-foot">
        <button class="btn" type="button" value="cancel" autofocus>Keep it</button>
        <button class="btn btn-danger" type="button" value="delete">${icon("trash", "icon-sm")}Delete report</button>
      </div>`;
    document.body.appendChild(dlg);
    const done = (v) => { dlg.close(); dlg.remove(); resolve(v); };
    dlg.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => done(b.value === "delete")));
    dlg.addEventListener("cancel", (e) => { e.preventDefault(); done(false); });
    dlg.showModal();
  });
}

/**
 * Handles a click on a [data-action] button.
 * Returns true if data changed (caller should refresh).
 */
export async function handleReportAction(btn, reports) {
  const { action, id } = btn.dataset;
  const report = reports.find((r) => r.id === id);
  if (!report) return false;

  if (action === "delete" && !(await confirmDelete(report.item_name))) return false;

  const label = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner" aria-hidden="true"></span>${action === "delete" ? "Deleting…" : "Saving…"}`;

  let result;
  if (action === "delete") result = await supabase.from("reports").delete().eq("id", id).select("id");
  else result = await supabase.from("reports").update({ status: action === "resolve" ? "resolved" : "open" }).eq("id", id).select("id");

  const { data, error } = result;
  if (error || !data?.length) {
    toast(error ? friendlyError(error, "write") : "That report couldn't be changed. It may have been deleted, or it isn't yours.", "error");
    btn.disabled = false;
    btn.innerHTML = label;
    return !error; // refresh if the row vanished
  }
  if (action === "delete" && report.photo_path) await deletePhoto(report.photo_path);
  toast(
    action === "delete" ? `Deleted “${report.item_name}”.`
      : action === "resolve" ? `Nice! “${report.item_name}” is marked as resolved.`
      : `“${report.item_name}” is open again.`,
  );
  return true;
}
