(function () {
  if (W2G.auth.current()) location.replace("../main/main.html");
  var err = document.getElementById("err");
  var forms = { login: document.getElementById("loginForm"), register: document.getElementById("registerForm") };
  document.querySelectorAll(".tab").forEach(function (t) {
    t.addEventListener("click", function () {
      document.querySelectorAll(".tab").forEach(function (x) { x.classList.toggle("active", x === t); });
      Object.keys(forms).forEach(function (k) { forms[k].classList.toggle("hidden", k !== t.dataset.tab); });
      err.textContent = "";
    });
  });
  function go(r) { if (r.ok) location.replace("../main/main.html"); else err.textContent = r.msg; }
  forms.login.addEventListener("submit", function (e) {
    e.preventDefault();
    var f = new FormData(forms.login);
    go(W2G.auth.login(f.get("email"), f.get("pass")));
  });
  forms.register.addEventListener("submit", function (e) {
    e.preventDefault();
    var f = new FormData(forms.register);
    go(W2G.auth.register(f.get("name"), f.get("email"), f.get("pass")));
  });
  document.getElementById("guestBtn").addEventListener("click", function () { W2G.auth.guest(); go({ ok: true }); });
})();
