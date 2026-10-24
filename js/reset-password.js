import { supabase, initPage, friendlyError, showAlert, hideAlert, setBusy, setFlash, firstName, displayName } from "./common.js";
import { setupPasswordToggles, fieldError } from "./auth-forms.js";

const form = document.getElementById("reset-form");
const alertBox = document.getElementById("form-alert");
const submit = document.getElementById("submit");
const intro = document.getElementById("reset-intro");
setupPasswordToggles();

// Errors from Supabase arrive in the URL hash or query (for example an expired link).
const hashParams = new URLSearchParams(location.hash.slice(1));
const queryParams = new URLSearchParams(location.search);
const linkError = hashParams.get("error_description") || queryParams.get("error_description");

let recovery = /type=recovery/.test(location.hash);
supabase.auth.onAuthStateChange((event) => { if (event === "PASSWORD_RECOVERY") recovery = true; });

await initPage();

// Give the client a moment to read the token from the link.
let session = null;
for (let i = 0; i < 12 && !session && !linkError; i++) {
  ({ data: { session } } = await supabase.auth.getSession());
  if (!session) await new Promise((r) => setTimeout(r, 250));
}
if (location.hash) history.replaceState(null, "", location.pathname);

if (!session) {
  intro.textContent = "";
  showAlert(alertBox,
    linkError
      ? "This reset link is invalid or has expired. Reset links work only once and only for a limited time."
      : "Open this page from the link in your password reset email.",
    "error", "Link not valid");
  document.getElementById("request-again").hidden = false;
} else {
  intro.textContent = recovery
    ? `Reset link accepted for ${session.user.email}. Choose a new password below.`
    : `You're signed in as ${session.user.email}. Choose a new password below.`;
  form.hidden = false;
  form.password.focus();
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert(alertBox);
  const pw = form.password.value;
  const ok = [
    fieldError("password",
      pw.length < 8 ? "Use at least 8 characters."
        : !/[A-Za-z]/.test(pw) || !/\d/.test(pw) ? "Include at least one letter and one number."
        : pw.length > 72 ? "Keep your password under 72 characters." : ""),
    fieldError("confirm", form.confirm.value !== pw ? "Passwords don't match." : ""),
  ].every(Boolean);
  if (!ok) { form.querySelector("[aria-invalid='true']")?.focus(); return; }

  setBusy(submit, true, "Saving…");
  const { data, error } = await supabase.auth.updateUser({ password: pw });
  if (error) {
    const message = error.code === "same_password"
      ? "Your new password must be different from your old one."
      : friendlyError(error);
    showAlert(alertBox, message, "error", "Couldn't update your password");
    setBusy(submit, false);
    return;
  }
  setFlash(`Password updated. Welcome back, ${firstName(displayName(data.user))}!`);
  location.replace("dashboard.html");
});
