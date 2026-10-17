// Small helpers shared by the login and registration forms.
import { icon } from "./common.js";

export function setupPasswordToggles() {
  document.querySelectorAll("[data-pw-toggle]").forEach((btn) => {
    const input = document.getElementById(btn.dataset.pwToggle);
    btn.innerHTML = icon("eye");
    btn.addEventListener("click", () => {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.innerHTML = icon(show ? "eyeOff" : "eye");
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
      btn.setAttribute("aria-pressed", String(show));
    });
  });
}

export function fieldError(id, message) {
  const input = document.getElementById(id);
  const out = document.getElementById(`${id}-error`);
  if (message) {
    input.setAttribute("aria-invalid", "true");
    out.innerHTML = `${icon("alert", "icon-sm")}${message.replace(/[<>&]/g, "")}`;
  } else {
    input.removeAttribute("aria-invalid");
    out.textContent = "";
  }
  return !message;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
