import { supabase, initPage, friendlyError, showAlert, hideAlert, setBusy, setFlash, safeNext, displayName, firstName } from "./common.js";
import { setupPasswordToggles, fieldError, EMAIL_RE } from "./auth-forms.js";

const params = new URLSearchParams(location.search);
const next = safeNext(params.get("next"));
const form = document.getElementById("login-form");
const alertBox = document.getElementById("form-alert");
const submit = document.getElementById("submit");

document.getElementById("register-link").href = `register.html${params.get("next") ? `?next=${encodeURIComponent(next)}` : ""}`;
setupPasswordToggles();

const session = await initPage();
if (session) {
  location.replace(next);
} else if (params.get("confirmed") === "1" || location.hash.includes("type=signup")) {
  showAlert(alertBox, "Your email is confirmed. You can log in now.", "success", "All set!");
} else if (params.get("error_description")) {
  showAlert(alertBox, "That confirmation link is invalid or has expired. Try logging in, or register again to get a new link.", "error", "Link problem");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert(alertBox);
  const email = form.email.value.trim().toLowerCase();
  const password = form.password.value;

  const ok = [
    fieldError("email", !email ? "Enter your email address." : !EMAIL_RE.test(email) ? "Enter a valid email address, like juan@example.com." : ""),
    fieldError("password", !password ? "Enter your password." : ""),
  ].every(Boolean);
  if (!ok) { form.querySelector("[aria-invalid='true']")?.focus(); return; }

  setBusy(submit, true, "Logging in…");
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setFlash(`Welcome back, ${firstName(displayName(data.user))}!`);
    location.replace(next);
  } catch (err) {
    showAlert(alertBox, friendlyError(err), "error", "Couldn't log you in");
    form.password.value = "";
    form.password.focus();
    setBusy(submit, false);
  }
});
