(function () {
  var user = W2G.auth.current();
  if (!user) { location.replace("../login/login.html"); return; }
  var S = W2G.store;
  var $ = function (id) { return document.getElementById(id); };
  var player = new W2GPlayer($("player"));
  player.setState("idle");
  var state = { source: S.read("w2g_source", "ara"), cat: "all", q: "", list: [], page: 1 };
  var favs = S.read("w2g_favs", {});
  var recent = S.read("w2g_recent", []);
  var DAY = 864e5, now = Date.now();
  var dead = S.read("w2g_dead", {});
  Object.keys(dead).forEach(function (k) { if (now - dead[k] > DAY) delete dead[k]; });
  S.write("w2g_dead", dead);
  function alive(c) { return !dead[c.id]; }
  favs = Object.keys(favs).reduce(function (o, k) { if (!dead[k]) o[k] = favs[k]; return o; }, {});
  recent = recent.filter(alive);
  var loadTok = 0;
  var PAGE = 48;
  $("userName").textContent = user.name;
  $("avatar").textContent = (user.name || "W").trim().charAt(0).toUpperCase();
  function setNav(k) { document.querySelectorAll("[data-nav],.nav-i[data-c],.bottom-nav [data-c]").forEach(function (b) { b.classList.toggle("active", (b.dataset.nav || "c-" + b.dataset.c) === k); }); }
  document.addEventListener("click", function (e) {
    var n = e.target.closest("[data-nav]");
    if (n) {
      var k = n.dataset.nav; setNav(k);
      if (k === "home") { window.scrollTo({ top: 0, behavior: "smooth" }); }
      else if (k === "movies" || k === "series") { setMode(k); }
      else if (k === "live") { setMode("live"); state.cat = "all"; state.page = 1; renderCats(); renderContent(); $("sources").scrollIntoView({ behavior: "smooth", block: "start" }); }
      else if (k === "recent") { setMode("live"); document.querySelector(".now").scrollIntoView({ behavior: "smooth", block: "center" }); }
      return;
    }
    var f = e.target.closest(".nav-i[data-c],.bottom-nav [data-c]");
    if (f) { setMode("live"); setNav("c-" + f.dataset.c); }
  });
  $("logout").onclick = function () { W2G.auth.logout(); location.replace("../login/login.html"); };

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function initials(n) { return esc(n.replace(/[^\p{L}\p{N} ]/gu, "").trim().slice(0, 2).toUpperCase() || "TV"); }
  function imgTag(ch) {
    return ch.logo ? '<img loading="lazy" src="' + esc(ch.logo) + '" alt="' + esc(ch.name) + '" onerror="this.outerHTML=\'<span class=ph>' + initials(ch.name) + '</span>\'">' : '<span class="ph">' + initials(ch.name) + "</span>";
  }
  function card(ch) {
    var cls = "card" + (player.channel && player.channel.id === ch.id ? " playing" : "") + "";
    var badge = favs[ch.id] ? '<span class="badge">مفضلة</span>' : "";
    return '<button class="' + cls + '" data-id="' + esc(ch.id) + '">' + badge + '<div class="card-img">' + imgTag(ch) + '</div><div class="card-body"><strong>' + esc(ch.name) + "</strong><span>" + esc(ch.cat.label) + "</span></div></button>";
  }
  function byId(id) {
    var c = state.list.filter(function (x) { return x.id === id; })[0];
    if (!c && favs[id]) c = favs[id];
    if (!c) c = recent.filter(function (x) { return x.id === id; })[0];
    return c;
  }
  function filtered() {
    var q = state.q.trim().toLowerCase();
    var l = state.cat === "fav" ? Object.keys(favs).map(function (k) { return favs[k]; }) : state.list;
    if (state.cat !== "all" && state.cat !== "fav") l = l.filter(function (c) { return c.cat.key === state.cat; });
    if (q) l = l.filter(function (c) { return c.name.toLowerCase().indexOf(q) > -1; });
    return l;
  }
  function groups() {
    var g = {}, order = [];
    state.list.forEach(function (c) { if (!g[c.cat.key]) { g[c.cat.key] = { key: c.cat.key, label: c.cat.label, items: [] }; order.push(c.cat.key); } g[c.cat.key].items.push(c); });
    return order.map(function (k) { return g[k]; }).sort(function (a, b) { return b.items.length - a.items.length; });
  }
  function renderSources() {
    $("sources").innerHTML = W2GPlaylist.sources.map(function (s) { return '<button class="chip' + (s.id === state.source ? " active" : "") + '" data-s="' + s.id + '">' + s.label + "</button>"; }).join("");
  }
  function renderCats() {
    var g = groups();
    var html = '<button data-c="all" class="' + (state.cat === "all" ? "active" : "") + '">الكل<b>' + state.list.length + "</b></button>";
    html += '<button data-c="fav" class="' + (state.cat === "fav" ? "active" : "") + '">المفضلة<b>' + Object.keys(favs).length + "</b></button>";
    g.forEach(function (x) { html += '<button data-c="' + esc(x.key) + '" class="' + (state.cat === x.key ? "active" : "") + '">' + esc(x.label) + "<b>" + x.items.length + "</b></button>"; });
    $("cats").innerHTML = html;
  }
  function renderContent() {
    var el = $("content");
    if (state.cat === "all" && !state.q) {
      el.innerHTML = groups().map(function (g) {
        return '<div class="row"><div class="row-head"><h3>' + esc(g.label) + '</h3><button data-c="' + esc(g.key) + '">عرض الكل (' + g.items.length + ')</button></div><div class="row-track">' + g.items.slice(0, 20).map(card).join("") + "</div></div>";
      }).join("") || '<div class="status">مفيش قنوات هنا</div>';
      return;
    }
    var l = filtered();
    if (!l.length) { el.innerHTML = '<div class="status">' + (state.cat === "fav" ? "لسه مضفتش قنوات للمفضلة" : "مفيش نتايج") + "</div>"; return; }
    var shown = l.slice(0, state.page * PAGE);
    el.innerHTML = '<div class="grid">' + shown.map(card).join("") + "</div>" + (shown.length < l.length ? '<div class="more"><button class="btn btn-ghost" id="moreBtn">عرض قنوات أكتر</button></div>' : "");
  }
  function renderNow() {
    var ch = player.channel;
    $("nowName").textContent = ch ? ch.name : "مفيش قناة شغالة";
    $("nowCat").textContent = ch ? ch.cat.label : "";
    var img = $("nowLogo");
    if (ch && ch.logo) { img.src = ch.logo; img.style.visibility = "visible"; } else { img.removeAttribute("src"); img.style.visibility = "hidden"; }
    var f = $("favBtn");
    f.disabled = !ch;
    f.classList.toggle("on", !!(ch && favs[ch.id]));
    f.textContent = ch && favs[ch.id] ? "في المفضلة" : "أضف للمفضلة";
    $("recent").innerHTML = recent.length ? recent.map(function (c) { return '<button data-id="' + esc(c.id) + '">' + (c.logo ? '<img src="' + esc(c.logo) + '" alt="">' : "") + esc(c.name) + "</button>"; }).join("") : '<p class="empty-s">لسه مشوفتش حاجة</p>';
  }
  function renderAll() { renderCats(); renderContent(); renderNow(); }
  function load() {
    renderSources();
    $("content").innerHTML = '<div class="status"><div class="spinner"></div>بنجهز القنوات...</div>';
    var tok = ++loadTok;
    W2GPlaylist.load(state.source).then(function (l) { if (tok !== loadTok) return; state.list = l.filter(alive); renderAll(); }).catch(function () {
      $("content").innerHTML = '<div class="status">مقدرناش نحمل القنوات، اتأكد من النت<button class="btn btn-ghost" id="retryBtn">حاول تاني</button></div>';
    });
  }
  function play(ch) {
    player.load(ch);
    recent = [ch].concat(recent.filter(function (x) { return x.id !== ch.id; })).slice(0, 12);
    S.write("w2g_recent", recent);
    document.querySelectorAll(".card.playing").forEach(function (x) { x.classList.remove("playing"); });
    document.querySelectorAll('.card[data-id="' + CSS.escape(ch.id) + '"]').forEach(function (x) { x.classList.add("playing"); });
    renderNow();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  player.onfail = function (ch) {
    dead[ch.id] = Date.now();
    S.write("w2g_dead", dead);
    state.list = state.list.filter(alive);
    delete favs[ch.id]; S.write("w2g_favs", favs);
    recent = recent.filter(alive); S.write("w2g_recent", recent);
    player.channel = null;
    player.setState("idle");
    renderAll();
    W2G.toast("القناة دي وقفت واتشالت من القايمة");
  };
  
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-s],[data-c],[data-id],#moreBtn,#retryBtn,#favBtn");
    if (!t) return;
    if (t.dataset.s) { state.source = t.dataset.s; state.cat = "all"; state.page = 1; S.write("w2g_source", state.source); load(); }
    else if (t.dataset.c) { state.cat = t.dataset.c; state.page = 1; renderCats(); renderContent(); $("cats").scrollIntoView({ behavior: "smooth", block: "start" }); }
    else if (t.dataset.id) { var ch = byId(t.dataset.id); if (ch) play(ch); }
    else if (t.id === "moreBtn") { state.page++; renderContent(); }
    else if (t.id === "retryBtn") load();
    else if (t.id === "favBtn" && player.channel) {
      var c = player.channel;
      if (favs[c.id]) delete favs[c.id]; else favs[c.id] = c;
      S.write("w2g_favs", favs);
      W2G.toast(favs[c.id] ? "اتضافت للمفضلة" : "اتشالت من المفضلة");
      renderAll();
    }
  });
  // ===== Movies & series =====
  var V = window.W2GVod, mode = "live", vodItem = null, vodServer = S.read("w2g_server", "to");
  var vodPos = S.read("w2g_vodpos", {}), vodTok = 0;
  function setMode(m) {
    mode = m;
    var live = m === "live";
    ["sources", "cats", "content"].forEach(function (id) { $(id).hidden = !live; });
    $("vod").hidden = live;
    if (!live) { renderVod(); $("vod").scrollIntoView({ behavior: "smooth", block: "start" }); }
  }
  function hue(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; }
  function poster(x) {
    var t = V.title(x), sub = [x.en && x.ar ? x.en : "", x.y].filter(Boolean).join(" · ");
    return '<button class="poster' + (vodItem && vodItem.id === x.id ? " playing" : "") + '" data-v="' + esc(x.id) + '" style="--h:' + hue(x.tmdb) + '"><span class="p-art">' + esc((x.en || t).replace(/[^\p{L}\p{N} ]/gu, "").split(" ").filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join("").toUpperCase() || "W2G") + '</span>' + (x.p ? '<img class="p-img" loading="lazy" alt="" src="' + esc(x.p) + '" onerror="this.remove()">' : "") + '<span class="p-play"><i class="ico ico-play"></i></span><span class="p-body"><strong>' + esc(t) + "</strong><small>" + esc(sub) + "</small></span></button>";
  }
  function renderVod() {
    var isM = mode === "movies", list = isM ? V.movies : V.series, q = state.q.trim().toLowerCase();
    var head = '<div class="vod-head"><h2>' + (isM ? "أفلام" : "مسلسلات") + '</h2><form class="vod-id" id="vodId"><input name="tm" placeholder="الصق لينك الفيلم من IMDb أو TMDB"><button class="btn btn-ghost">شغّل</button><a class="btn btn-ghost" target="_blank" rel="noopener" href="https://www.imdb.com/find/?s=tt&q=' + encodeURIComponent(state.q) + '">IMDb</a><a class="btn btn-ghost" target="_blank" rel="noopener" href="https://www.themoviedb.org/search?query=' + encodeURIComponent(state.q) + '">TMDB</a></form></div>';
    if (q) {
      var r = list.filter(function (x) { return (x.ar + " " + x.en).toLowerCase().indexOf(q) > -1; });
      var grid = function (l) { return l.length ? '<div class="vod-grid">' + l.map(poster).join("") + "</div>" : ""; };
      $("vod").innerHTML = head + (r.length ? '<div class="row"><div class="row-head"><h3>من قايمتنا</h3></div>' + grid(r) + "</div>" : "") + '<div class="row" id="vodNet"><div class="status"><div class="spinner"></div>بندور على "' + esc(state.q) + '"...</div></div>';
      var tok = ++vodTok, type = isM ? "m" : "t";
      V.search(state.q, type).then(function (l) {
        if (tok !== vodTok) return;
        var have = {}; r.forEach(function (x) { if (x.imdb) have[x.imdb] = 1; });
        l = l.filter(function (x) { return !have[x.imdb]; });
        $("vodNet").innerHTML = l.length ? '<div class="row-head"><h3>نتايج البحث</h3></div>' + grid(l) : (r.length ? "" : '<div class="status">مفيش نتايج</div>');
      }).catch(function () { if (tok === vodTok) $("vodNet").innerHTML = '<div class="status">البحث مش متاح دلوقتي</div>'; });
      return;
    }
    var groups = isM ? [["جديد للتجربة", list.filter(function (x) { return x.cat === "new"; })], ["أفلام عربية ومصرية", list.filter(function (x) { return x.cat === "arabic"; })], ["أفلام عالمية", list.filter(function (x) { return x.cat === "world"; })]] : [["مسلسلات مشهورة", list]];
    $("vod").innerHTML = head + groups.filter(function (g) { return g[1].length; }).map(function (g) {
      return '<div class="row"><div class="row-head"><h3>' + g[0] + "</h3></div>" + (g[1].length > 8 ? '<div class="vod-grid">' : '<div class="vod-track">') + g[1].map(poster).join("") + "</div></div>";
    }).join("");
  }
  function renderVodCtl() {
    var x = vodItem, el = $("vodCtl");
    if (!x) { el.hidden = true; return; }
    var p = vodPos[x.id] || { s: 1, e: 1 };
    el.hidden = false;
    el.innerHTML = "<strong>" + esc(V.title(x)) + "</strong>" +
      (x.type === "t" ? '<label>الموسم<input id="vS" type="number" min="1" value="' + p.s + '"></label><label>الحلقة<input id="vE" type="number" min="1" value="' + p.e + '"></label><button class="btn btn-ghost sm" data-ep="-1">السابقة</button><button class="btn btn-ghost sm" data-ep="1">التالية</button>' : "") +
      V.servers.map(function (s) { return '<button class="chip' + (s.id === vodServer ? " active" : "") + '" data-sv="' + s.id + '">' + s.label + "</button>"; }).join("");
  }
  function playVod(x) {
    vodItem = x;
    var p = vodPos[x.id] || { s: 1, e: 1 };
    player.embed(x, V.url(vodServer, x, p.s, p.e));
    $("nowName").textContent = V.title(x) + (x.type === "t" ? " · م" + p.s + " ح" + p.e : "");
    $("nowCat").textContent = x.type === "t" ? "مسلسل" : "فيلم";
    if (x.p) { $("nowLogo").src = x.p; $("nowLogo").style.visibility = "visible"; } else $("nowLogo").style.visibility = "hidden"; $("favBtn").disabled = true;
    renderVodCtl();
    document.querySelectorAll(".poster.playing").forEach(function (b) { b.classList.remove("playing"); });
    document.querySelectorAll('.poster[data-v="' + CSS.escape(x.id) + '"]').forEach(function (b) { b.classList.add("playing"); });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function setEp(s, e) { vodPos[vodItem.id] = { s: Math.max(1, s), e: Math.max(1, e) }; S.write("w2g_vodpos", vodPos); playVod(vodItem); }
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-v],[data-sv],[data-ep]");
    if (!t) return;
    if (t.dataset.v) { var x = V.find(t.dataset.v); if (x) playVod(x); }
    else if (t.dataset.sv) { vodServer = t.dataset.sv; S.write("w2g_server", vodServer); if (vodItem) playVod(vodItem); }
    else if (t.dataset.ep && vodItem) { var p = vodPos[vodItem.id] || { s: 1, e: 1 }; setEp(p.s, p.e + +t.dataset.ep); }
  });
  document.addEventListener("change", function (e) { if ((e.target.id === "vS" || e.target.id === "vE") && vodItem) setEp(+$("vS").value || 1, e.target.id === "vS" ? 1 : +$("vE").value || 1); });
  document.addEventListener("submit", function (e) {
    if (e.target.id !== "vodId") return; e.preventDefault();
    var x = V.custom(e.target.elements.tm.value, mode === "series" ? "t" : "m");
    if (x) playVod(x); else W2G.toast("اكتب رقم صحيح");
  });
  var _play = play;
  play = function (ch) { vodItem = null; renderVodCtl(); _play(ch); };

  var st;
  $("search").addEventListener("input", function (e) { clearTimeout(st); st = setTimeout(function () { state.q = e.target.value; state.page = 1; if (mode === "live") renderContent(); else renderVod(); }, 200); });
  load();
})();
