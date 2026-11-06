(function () {
  var S = W2G.store, API = (window.W2G_API || "").replace(/\/$/, "");
  var $ = function (id) { return document.getElementById(id); };
  var cur = null, site = "";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function open(name) {
    site = name;
    $("pick").hidden = true; $("browser").hidden = false;
    $("site").src = API + "/browse/" + name + "/";
    [].forEach.call(document.querySelectorAll("#sites [data-site]"), function (b) { b.classList.toggle("active", b.dataset.site === name); });
    setItem(null);
  }
  function setItem(d) {
    cur = d && d.tmdb ? d : null;
    $("fab").hidden = !cur;
    if (!cur) return;
    var tv = cur.type === "tv";
    $("ep").hidden = !tv || !!cur.s;
    if (tv && !cur.s) { var p = S.read("w2g_pos", {})["t" + cur.tmdb]; $("dS").value = p ? p.s : 1; $("dE").value = p ? p.e : 1; }
  }
  function idOf() {
    if (cur.type !== "tv") return "m" + cur.tmdb;
    var s = cur.s || Math.max(1, +$("dS").value || 1), e = cur.e || Math.max(1, +$("dE").value || 1);
    var pos = S.read("w2g_pos", {}); pos["t" + cur.tmdb] = { s: s, e: e }; S.write("w2g_pos", pos);
    return "t" + cur.tmdb + "s" + s + "e" + e;
  }
  function getToken(id) {
    var all = S.read("w2g_tokens", {}), now = Date.now() / 1000;
    Object.keys(all).forEach(function (k) { if (all[k].exp < now) delete all[k]; });
    if (all[id] && all[id].exp > now + 60) return Promise.resolve(all[id].t);
    return fetch(API + "/api/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: id }) }).then(function (r) {
      return r.json().then(function (j) {
        if (r.status !== 200 || !j.token) throw r.status;
        all[id] = { t: j.token, exp: +j.token.split(".")[0] }; S.write("w2g_tokens", all);
        return j.token;
      });
    });
  }
  function sheet(html) { $("sheet").innerHTML = html; $("modal").hidden = false; document.body.style.overflow = "hidden"; }
  function close() { $("modal").hidden = true; $("sheet").innerHTML = ""; document.body.style.overflow = ""; }
  function play() {
    if (!cur) return;
    var id = idOf(), name = cur.title || "", ep = /s(\d+)e(\d+)$/.exec(id);
    var head = '<button class="x" data-close>✕</button><div class="pl-head"><strong>' + esc(name) + "</strong>" + (ep ? "<span>الموسم " + ep[1] + " · الحلقة " + ep[2] + "</span>" : "") + "</div>";
    if (!API) return sheet(head + '<div class="pl-box msg">السيرفر لسه مش متوصل.</div>');
    sheet(head + '<div class="pl-box msg"><div class="spinner"></div></div>');
    getToken(id).then(function (t) {
      var box = document.querySelector(".pl-box"); if (!box) return;
      box.className = "pl-box";
      box.innerHTML = '<iframe src="' + esc(API + "/embed?id=" + encodeURIComponent(id) + "&t=" + encodeURIComponent(t)) + '" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen referrerpolicy="origin"></iframe>';
    }).catch(function (s) {
      var b = document.querySelector(".pl-box"); if (!b) return;
      b.textContent = s === 403 ? "الموقع ده مش مسموح له يستخدم السيرفر." : s === 429 ? "طلبات كتير، استنى دقيقة." : "مقدرناش نوصل للسيرفر، جرب تاني.";
    });
  }

  window.addEventListener("message", function (ev) {
    if (!API || ev.origin !== new URL(API).origin || !ev.data || ev.data.w2g !== 1) return;
    setItem(ev.data.item);
  });
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-site],[data-close],#playBtn"); if (!t) return;
    if (t.id === "playBtn") play();
    else if (t.dataset.site) open(t.dataset.site);
    else close();
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
})();
