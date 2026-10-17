// Shows a helpful message if the app's scripts fail to load (offline, blocked CDN, very old browser).
(function () {
  setTimeout(function () {
    if (window.__finditReady) return;
    var main = document.getElementById("main");
    if (!main) return;
    var wrap = document.createElement("div");
    wrap.className = "container";
    wrap.innerHTML =
      '<div class="alert alert-error boot-alert" role="alert"><div><strong>FindIt couldn’t finish loading.</strong>' +
      "<p>Check your internet connection and refresh the page. If you use an ad or script blocker, allow cdn.jsdelivr.net and supabase.co.</p></div></div>";
    main.insertBefore(wrap, main.firstChild);
  }, 9000);
})();
