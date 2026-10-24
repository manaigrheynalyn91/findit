import { supabase, initPage, friendlyError, showAlert, hideAlert, setBusy } from "./common.js";
import { fieldError, EMAIL_RE } from "./auth-forms.js";

const form = document.getElementById("forgot-form");
const alertBox = document.getElementById("form-alert");
const submit = document.getElementById("submit");

await initPage();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert(alertBox);
  const email = form.email.value.trim().toLowerCase();
  if (!fieldError("email", !email ? "Enter your email address." : !EMAIL_RE.test(email) ? "Enter a valid email address, like juan@example.com." : "")) {
    form.email.focus();
    return;
  }

  setBusy(submit, true, "Sending…");
  const redirectTo = new URL("reset-password.html", location.href).href;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  // Rate limits and network problems are worth reporting. Any other result shows the
  // same neutral message, so this page never reveals whether an email is registered.
  const status = Number(error?.status || 0);
  const msg = String(error?.message || "").toLowerCase();
  if (error && (status === 429 || msg.includes("rate limit") || !navigator.onLine || msg.includes("fetch"))) {
    showAlert(alertBox, friendlyError(error), "error", "Couldn't send the link");
    setBusy(submit, false);
    return;
  }
  if (error) console.warn("Password reset request:", error);

  document.getElementById("sent-to").textContent = email;
  document.getElementById("request-view").hidden = true;
  const sent = document.getElementById("sent-view");
  sent.hidden = false;
  sent.querySelector("h1").focus();
});
