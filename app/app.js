(function () {
  var S = W2G.store, API = (window.W2G_API || "").replace(/\/$/, "");
  var C = window.W2G_CATALOG || { movies: [], series: [] };
  var $ = function (id) { return document.getElementById(id); };
  var tab = "home", q = "", extra = {}, searchTok = 0;
  var list = S.read("w2g_list", {}), pos = S.read("w2g_pos", {});
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function title(x) { return x.ar || x.en; }
  function all() { return C.movies.concat(C.series); }
  function find(id) { return extra[id] || all().filter(function (x) { return x.id === id; })[0] || list[id]; }
  function big(p) { return p ? p.replace("_UX300_", "_UX900_") : ""; }
  function vid(x) { var s = x.imdb || "tm" + x.tmdb; if (x.type === "t") { var p = pos[x.id] || { s: 1, e: 1 }; s += "s" + p.s + "e" + p.e; } return s; }

  function poster(x) {
    return '<button class="poster" data-open="' + esc(x.id) + '"><div class="p-img">' + (x.p ? '<img loading="lazy" alt="" src="' + esc(x.p) + '" onerror="this.remove()">' : "") + '<span class="p-ph">' + esc(title(x)) + '</span></div><strong>' + esc(title(x)) + "</strong><small>" + esc([x.type === "t" ? "مسلسل" : "فيلم", x.y].filter(Boolean).join(" · ")) + "</small></button>";
  }
  function row(name, l) { return l.length ? '<section class="row"><h3>' + name + '</h3><div class="track">' + l.map(poster).join("") + "</div></section>" : ""; }
  function grid(l) { return '<div class="grid">' + l.map(poster).join("") + "</div>"; }
  function hero(x) {
    return '<section class="hero" style="--img:url(\'' + esc(big(x.p)) + '\')"><div class="hero-in"><span class="tag">مختار ليك</span><h1>' + esc(title(x)) + "</h1><p>" + esc([x.en && x.ar && x.en !== x.ar ? x.en : "", x.y, x.type === "t" ? "مسلسل" : "فيلم"].filter(Boolean).join(" · ")) + '</p><div class="hero-act"><button class="btn btn-primary" data-play="' + esc(x.id) + '"><i class="ico ico-play"></i>شغّل</button><button class="btn btn-ghost" data-open="' + esc(x.id) + '">تفاصيل</button></div></div></section>';
  }

  function render() {
    document.querySelectorAll("[data-tab]").forEach(function (b) { b.classList.toggle("active", b.dataset.tab === tab); });
    var v = $("view");
    if (q.trim()) return renderSearch();
    if (tab === "home") {
      var withP = all().filter(function (x) { return x.p; });
      var f = withP[Math.floor(Date.now() / 36e5) % Math.max(1, withP.length)];
      var mine = Object.keys(list).map(function (k) { return list[k]; });
      v.innerHTML = (f ? hero(f) : "") + row("قايمتي", mine) + row("جديد", C.movies.filter(function (x) { return x.cat === "new"; })) + row("أفلام عربية ومصرية", C.movies.filter(function (x) { return x.cat === "arabic"; })) + row("مسلسلات مشهورة", C.series.slice(0, 24)) + row("أفلام عالمية", C.movies.filter(function (x) { return x.cat === "world"; }).slice(0, 30));
    } else if (tab === "movies") v.innerHTML = '<h2 class="page-h">أفلام</h2>' + grid(C.movies);
    else if (tab === "series") v.innerHTML = '<h2 class="page-h">مسلسلات</h2>' + grid(C.series);
    else { var m = Object.keys(list).map(function (k) { return list[k]; }); v.innerHTML = '<h2 class="page-h">قايمتي</h2>' + (m.length ? grid(m) : '<div class="empty">لسه مضفتش حاجة. افتح أي فيلم ودوس «أضف لقايمتي».</div>'); }
  }
  function renderSearch() {
    var s = q.trim().toLowerCase(), v = $("view");
    var local = all().filter(function (x) { return (x.ar + " " + x.en).toLowerCase().indexOf(s) > -1; });
    v.innerHTML = '<h2 class="page-h">نتايج "' + esc(q) + '"</h2>' + (local.length ? grid(local) : "") + '<div id="net"><div class="empty"><div class="spinner"></div></div></div>';
    var tok = ++searchTok;
    fetch("https://v3.sg.media-imdb.com/suggestion/x/" + encodeURIComponent(s.slice(0, 60)) + ".json").then(function (r) { return r.json(); }).then(function (j) {
      if (tok !== searchTok) return;
      var have = {}; local.forEach(function (x) { if (x.imdb) have[x.imdb] = 1; });
      var l = (j.d || []).filter(function (r) { return /^tt/.test(r.id) && /^(movie|tvSeries|tvMiniSeries)$/.test(r.qid) && !have[r.id]; }).map(function (r) {
        var t = r.qid === "movie" ? "m" : "t";
        var x = { id: t + r.id, imdb: r.id, tmdb: r.id, type: t, ar: "", en: r.l, y: r.y ? String(r.y) : "", p: r.i ? r.i.imageUrl.replace("._V1_.jpg", "._V1_QL75_UX300_.jpg") : "", cast: r.s || "" };
        extra[x.id] = x; return x;
      });
      $("net").innerHTML = l.length ? grid(l) : (local.length ? "" : '<div class="empty">مفيش نتايج</div>');
    }).catch(function () { if (tok === searchTok) $("net").innerHTML = '<div class="empty">البحث مش متاح دلوقتي</div>'; });
  }

  function openSheet(html) { $("sheet").innerHTML = html; $("modal").hidden = false; document.body.style.overflow = "hidden"; }
  function close() { $("modal").hidden = true; $("sheet").innerHTML = ""; document.body.style.overflow = ""; }
  function details(x) {
    var p = pos[x.id] || { s: 1, e: 1 };
    openSheet('<button class="x" data-close>✕</button><div class="det"><div class="det-p">' + (x.p ? '<img alt="" src="' + esc(big(x.p)) + '">' : "") + '</div><div class="det-b"><h2>' + esc(title(x)) + "</h2><p class=muted>" + esc([x.en && x.en !== x.ar ? x.en : "", x.y, x.type === "t" ? "مسلسل" : "فيلم"].filter(Boolean).join(" · ")) + "</p>" + (x.cast ? "<p>" + esc(x.cast) + "</p>" : "") +
      (x.type === "t" ? '<div class="ep"><label>الموسم<input id="dS" type="number" min="1" value="' + p.s + '"></label><label>الحلقة<input id="dE" type="number" min="1" value="' + p.e + '"></label></div>' : "") +
      '<button class="fab" data-play="' + esc(x.id) + '"><i class="ico ico-play"></i>شغّل</button><div class="hero-act"><button class="btn btn-ghost" data-fav="' + esc(x.id) + '"><i class="ico ico-heart"></i>' + (list[x.id] ? "في قايمتك" : "أضف لقايمتي") + "</button></div></div></div>");
  }
  function play(x) {
    if (x.type === "t" && $("dS")) { pos[x.id] = { s: Math.max(1, +$("dS").value || 1), e: Math.max(1, +$("dE").value || 1) }; S.write("w2g_pos", pos); }
    var id = vid(x), p = pos[x.id];
    var head = '<button class="x" data-close>✕</button><div class="pl-head"><strong>' + esc(title(x)) + "</strong>" + (x.type === "t" ? "<span>الموسم " + p.s + " · الحلقة " + p.e + '</span><button class="btn btn-ghost sm" data-next="' + esc(x.id) + '">الحلقة التالية</button>' : "") + "</div>";
    if (!API) return openSheet(head + '<div class="pl-box msg">السيرفر لسه مش متوصل. حط رابط السيرفر في ملف config.js.</div>');
    openSheet(head + '<div class="pl-box msg"><div class="spinner"></div></div>');
    fetch(API + "/api/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: id }) }).then(function (r) { return r.json().then(function (j) { return { s: r.status, j: j }; }); }).then(function (r) {
      var box = document.querySelector(".pl-box"); if (!box) return;
      if (r.s === 200 && r.j.token) { box.className = "pl-box"; box.innerHTML = '<iframe src="' + esc(API + "/embed?id=" + encodeURIComponent(id) + "&t=" + encodeURIComponent(r.j.token)) + '" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="origin"></iframe>'; }
      else box.textContent = r.s === 404 ? "الفيديو ده لسه مش متضاف على السيرفر." : r.s === 403 ? "الموقع ده مش مسموح له يستخدم السيرفر." : r.s === 429 ? "طلبات كتير، استنى دقيقة." : "حصلت مشكلة، جرب تاني.";
    }).catch(function () { var b = document.querySelector(".pl-box"); if (b) b.textContent = "مقدرناش نوصل للسيرفر."; });
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-tab],[data-open],[data-play],[data-fav],[data-close],[data-next]");
    if (!t) return;
    var d = t.dataset;
    if (d.tab) { tab = d.tab; q = ""; $("q").value = ""; render(); window.scrollTo(0, 0); }
    else if ("close" in d) close();
    else if (d.open) { var x = find(d.open); if (x) details(x); }
    else if (d.play) { var y = find(d.play); if (y) play(y); }
    else if (d.next) { var z = find(d.next), p = pos[z.id] || { s: 1, e: 1 }; pos[z.id] = { s: p.s, e: p.e + 1 }; S.write("w2g_pos", pos); play(z); }
    else if (d.fav) { var w = find(d.fav); if (list[w.id]) delete list[w.id]; else list[w.id] = w; S.write("w2g_list", list); W2G.toast(list[w.id] ? "اتضاف لقايمتك" : "اتشال من قايمتك"); details(w); if (tab !== "home" || !q) render(); }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  var st; $("q").addEventListener("input", function (e) { clearTimeout(st); st = setTimeout(function () { q = e.target.value; render(); }, 250); });
  render();
})();
