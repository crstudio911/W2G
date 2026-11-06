(function () {
  var TH = "w2g_theme";
  var MOON = '<i class="ico ico-moon"></i>';
  var SUN = '<i class="ico ico-sun"></i>';
  function applyTheme(t) { document.documentElement.dataset.theme = t; document.querySelectorAll(".theme-btn").forEach(function (b) { b.innerHTML = t === "light" ? MOON : SUN; b.title = t === "light" ? "الوضع المظلم" : "الوضع المشرق"; }); }
  var saved = localStorage.getItem(TH) || (window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  applyTheme(saved);
  document.addEventListener("DOMContentLoaded", function () {
    applyTheme(document.documentElement.dataset.theme);
    document.querySelectorAll(".theme-btn").forEach(function (b) { b.onclick = function () { var t = document.documentElement.dataset.theme === "light" ? "dark" : "light"; localStorage.setItem(TH, t); applyTheme(t); }; });
  });
  function read(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function write(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  function toast(msg) {
    var t = document.querySelector(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }
  window.W2G = { store: { read: read, write: write }, toast: toast };
})();
