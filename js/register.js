import { supabase, initPage, friendlyError, showAlert, hideAlert, setBusy, setFlash, safeNext, firstName } from "./common.js";
import { setupPasswordToggles, fieldError, EMAIL_RE } from "./auth-forms.js";

const params = new URLSearchParams(location.search);
const next = safeNext(params.get("next"));
const form = document.getElementById("register-form");
const alertBox = document.getElementById("form-alert");
const submit = document.getElementById("submit");

document.getElementById("login-link").href = `login.html${params.get("next") ? `?next=${encodeURIComponent(next)}` : ""}`;
setupPasswordToggles();

const session = await initPage();
if (session) location.replace(next);

function validate() {
  const name = form.full_name.value.trim().replace(/\s+/g, " ");
  const email = form.email.value.trim().toLowerCase();
  const pw = form.password.value;
  const results = [
    fieldError("full_name", name.length < 2 ? "Enter your full name." : name.length > 80 ? "Keep your name under 80 characters." : ""),
    fieldError("email", !email ? "Enter your email address." : !EMAIL_RE.test(email) ? "Enter a valid email address, like juan@example.com." : ""),
    fieldError("password",
      pw.length < 8 ? "Use at least 8 characters."
        : !/[A-Za-z]/.test(pw) || !/\d/.test(pw) ? "Include at least one letter and one number."
        : pw.length > 72 ? "Keep your password under 72 characters." : ""),
    fieldError("confirm", form.confirm.value !== pw ? "Passwords don't match." : ""),
    fieldError("agree", !form.agree.checked ? "Please agree to the Privacy Policy to continue." : ""),
  ];
  return { ok: results.every(Boolean), name, email, pw };
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert(alertBox);
  const { ok, name, email, pw } = validate();
  if (!ok) { form.querySelector("[aria-invalid='true']")?.focus(); return; }

  setBusy(submit, true, "Creating account…");
  try {
    const redirect = new URL("login.html?confirmed=1", location.href).href;
    const { data, error } = await supabase.auth.signUp({
      email, password: pw,
      options: { data: { full_name: name }, emailRedirectTo: redirect },
    });
    if (error) throw error;

    // With email confirmation on, an existing address returns a user with no identities.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw { code: "user_already_exists", message: "User already registered" };
    }
    if (data.session) {
      setFlash(`Welcome to FindIt, ${firstName(name)}! Your account is ready.`);
      location.replace(next);
      return;
    }
    document.getElementById("sent-to").textContent = email;
    document.getElementById("register-view").hidden = true;
    document.getElementById("check-email").hidden = false;
    document.querySelector("#check-email h1").focus?.();
  } catch (err) {
    showAlert(alertBox, friendlyError(err), "error", "Couldn't create your account");
    setBusy(submit, false);
  }
});
