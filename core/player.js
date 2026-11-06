(function () {
  var I = function (n) { return '<i class="ico ico-' + n + '"></i>'; };
  var IDLE = '<div class="w2p-idle"><img src="../img/logo.png" alt=""><p>اختار قناة أو فيلم وابدأ المشاهدة</p></div>';
  function W2GPlayer(root) {
    var self = this;
    this.root = root;
    root.classList.add("w2p");
    root.tabIndex = 0;
    root.innerHTML =
      '<video playsinline></video>' +
      '<div class="w2p-frame"></div>' +
      '<div class="w2p-tap"><span class="w2p-zone" data-z="-1"></span><span class="w2p-zone" data-z="0"></span><span class="w2p-zone" data-z="1"></span></div>' +
      '<div class="w2p-state">' + IDLE + '</div>' +
      '<div class="w2p-flash"></div>' +
      '<button class="w2p-unmute" hidden>' + I("mute") + '<span>اضغط لتشغيل الصوت</span></button>' +
      '<div class="w2p-top"><span class="w2p-live"><b></b>مباشر</span><span class="w2p-title"></span><span class="w2p-sp"></span><span class="w2p-info"></span></div>' +
      '<div class="w2p-bar">' +
      '<div class="w2p-seek"><input type="range" min="0" max="1000" value="1000" step="1" aria-label="الوقت"><span class="w2p-buf"></span></div>' +
      '<div class="w2p-row">' +
      '<button class="w2p-btn w2p-big" data-a="play" aria-label="تشغيل">' + I("play") + '</button>' +
      '<button class="w2p-btn" data-a="back" aria-label="رجوع 10 ثواني">-10</button>' +
      '<button class="w2p-btn" data-a="fwd" aria-label="تقديم 10 ثواني">+10</button>' +
      '<div class="w2p-volw"><button class="w2p-btn" data-a="mute" aria-label="الصوت">' + I("volume") + '</button><input class="w2p-vol" type="range" min="0" max="1" step="0.05" value="1" aria-label="مستوى الصوت"></div>' +
      '<button class="w2p-golive" data-a="golive" hidden>رجوع للمباشر</button>' +
      '<span class="w2p-time"></span>' +
      '<span class="w2p-sp"></span>' +
      '<div class="w2p-menu-w"><button class="w2p-btn w2p-gear" data-a="menu" aria-label="الإعدادات">HD</button><div class="w2p-menu" hidden></div></div>' +
      '<button class="w2p-btn" data-a="reload" aria-label="إعادة تحميل">' + I("reload") + '</button>' +
      '<button class="w2p-btn" data-a="pip" aria-label="صورة داخل صورة">' + I("pip") + '</button>' +
      '<button class="w2p-btn" data-a="full" aria-label="ملء الشاشة">' + I("fullscreen") + '</button>' +
      '</div></div>';
    var q = function (s) { return root.querySelector(s); };
    this.video = q("video"); this.frame = q(".w2p-frame"); this.state = q(".w2p-state");
    this.title = q(".w2p-title"); this.info = q(".w2p-info"); this.vol = q(".w2p-vol");
    this.seek = q(".w2p-seek input"); this.buf = q(".w2p-buf"); this.time = q(".w2p-time");
    this.menu = q(".w2p-menu"); this.gear = q(".w2p-gear"); this.unmute = q(".w2p-unmute");
    this.golive = q(".w2p-golive"); this.flashEl = q(".w2p-flash");
    this.hls = null; this.onfail = null; this.onplaying = null; this.speed = 1; this.mode = "idle";
    var v = this.video;
    var savedVol = parseFloat(localStorage.getItem("w2g_vol") || "1");
    v.volume = isNaN(savedVol) ? 1 : savedVol; this.vol.value = v.volume;
    var act = {
      play: function () { self.toggle(); },
      mute: function () { v.muted = !v.muted; },
      full: function () { self.fullscreen(); },
      reload: function () { if (self.channel) self.load(self.channel); },
      back: function () { self.skip(-10); },
      fwd: function () { self.skip(10); },
      golive: function () { self.toLive(); },
      menu: function () { self.menu.hidden = !self.menu.hidden; if (!self.menu.hidden) self.buildMenu(); },
      pip: function () {
        if (document.pictureInPictureElement) document.exitPictureInPicture();
        else if (v.requestPictureInPicture) v.requestPictureInPicture().catch(function () {});
      }
    };
    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-a]");
      if (b && act[b.dataset.a]) { e.stopPropagation(); act[b.dataset.a](); self.poke(); }
      var m = e.target.closest("[data-lv],[data-sp]");
      if (m) {
        if (m.dataset.lv != null && self.hls) { self.hls.currentLevel = +m.dataset.lv; self.flash(m.textContent); }
        if (m.dataset.sp) { self.speed = v.playbackRate = +m.dataset.sp; self.flash(m.dataset.sp + "x"); }
        self.menu.hidden = true; self.updateGear();
      }
    });
    this.unmute.onclick = function (e) { e.stopPropagation(); v.muted = false; if (v.volume === 0) v.volume = 1; };
    this.vol.oninput = function () { v.volume = +self.vol.value; v.muted = v.volume === 0; localStorage.setItem("w2g_vol", v.volume); };
    this.seek.addEventListener("input", function () {
      self.seeking = true;
      var r = self.range(); if (!r) return;
      v.currentTime = r[0] + (r[1] - r[0]) * (+self.seek.value / 1000);
    });
    this.seek.addEventListener("change", function () { self.seeking = false; });
    var lastTap = 0, tapT;
    root.querySelectorAll(".w2p-zone").forEach(function (z) {
      z.addEventListener("click", function (e) {
        if (self.mode !== "video") return;
        var now = Date.now(), dir = +z.dataset.z;
        if (now - lastTap < 280 && dir !== 0) { clearTimeout(tapT); self.skip(dir * 10 * (document.dir === "rtl" ? -1 : 1)); lastTap = 0; return; }
        if (now - lastTap < 280 && dir === 0) { clearTimeout(tapT); self.fullscreen(); lastTap = 0; return; }
        lastTap = now;
        var touch = matchMedia("(hover: none)").matches;
        tapT = setTimeout(function () {
          if (touch && !root.classList.contains("w2p-show")) self.poke(); else self.toggle();
        }, 280);
      });
    });
    ["play", "pause"].forEach(function (e) { v.addEventListener(e, function () { self.sync(); self.flash(I(v.paused ? "pause" : "play")); }); });
    v.addEventListener("volumechange", function () { self.sync(); self.unmute.hidden = !(v.muted && self.mode === "video"); });
    v.addEventListener("waiting", function () { if (self.mode === "video") self.setState("loading"); });
    v.addEventListener("playing", function () { self.setState(""); if (self.onplaying) self.onplaying(self.channel); });
    v.addEventListener("timeupdate", function () { self.tick(); });
    v.addEventListener("progress", function () { self.tick(); });
    var hideT;
    this.poke = function () {
      root.classList.add("w2p-show"); clearTimeout(hideT);
      hideT = setTimeout(function () { if (!v.paused && self.menu.hidden) root.classList.remove("w2p-show"); }, 3000);
    };
    root.addEventListener("mousemove", this.poke);
    root.addEventListener("mouseleave", function () { if (!v.paused) root.classList.remove("w2p-show"); });
    document.addEventListener("click", function (e) { if (!e.target.closest(".w2p-menu-w")) self.menu.hidden = true; });
    document.addEventListener("fullscreenchange", function () { root.classList.toggle("w2p-fs", document.fullscreenElement === root); });
    document.addEventListener("keydown", function (e) {
      if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) || self.mode !== "video") return;
      var k = e.key.toLowerCase();
      if (e.code === "Space" || k === "k") { e.preventDefault(); self.toggle(); }
      else if (k === "f") self.fullscreen();
      else if (k === "m") v.muted = !v.muted;
      else if (k === "arrowleft") { e.preventDefault(); self.skip(-10); }
      else if (k === "arrowright") { e.preventDefault(); self.skip(10); }
      else if (k === "arrowup") { e.preventDefault(); v.muted = false; v.volume = Math.min(1, v.volume + 0.1); self.vol.value = v.volume; self.flash(Math.round(v.volume * 100) + "%"); }
      else if (k === "arrowdown") { e.preventDefault(); v.volume = Math.max(0, v.volume - 0.1); self.vol.value = v.volume; self.flash(Math.round(v.volume * 100) + "%"); }
      else return;
      self.poke();
    });
  }
  var P = W2GPlayer.prototype;
  function fmt(s) { s = Math.max(0, Math.floor(s)); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(x).padStart(2, "0"); }
  P.flash = function (html) {
    var f = this.flashEl; f.innerHTML = "<span>" + html + "</span>";
    f.classList.remove("on"); void f.offsetWidth; f.classList.add("on");
  };
  P.range = function () {
    var v = this.video;
    if (isFinite(v.duration) && v.duration > 0) return [0, v.duration];
    if (v.seekable.length) return [v.seekable.start(0), v.seekable.end(v.seekable.length - 1)];
    return null;
  };
  P.isLive = function () { return !isFinite(this.video.duration); };
  P.tick = function () {
    var v = this.video, r = this.range();
    var live = this.isLive();
    this.root.classList.toggle("w2p-islive", live);
    if (!r || r[1] - r[0] < 1) { this.seek.parentNode.style.visibility = "hidden"; this.time.textContent = ""; return; }
    this.seek.parentNode.style.visibility = live && r[1] - r[0] < 30 ? "hidden" : "visible";
    var p = (v.currentTime - r[0]) / (r[1] - r[0]);
    if (!this.seeking) this.seek.value = Math.round(p * 1000);
    this.seek.style.setProperty("--p", (p * 100) + "%");
    if (v.buffered.length) this.buf.style.width = Math.min(100, (v.buffered.end(v.buffered.length - 1) - r[0]) / (r[1] - r[0]) * 100) + "%";
    if (live) {
      var behind = r[1] - v.currentTime;
      var far = behind > 20;
      this.golive.hidden = !far;
      this.root.classList.toggle("w2p-behind", far);
      this.time.textContent = far ? "-" + fmt(behind) : "";
    } else {
      this.golive.hidden = true;
      this.time.textContent = fmt(v.currentTime) + " / " + fmt(v.duration);
    }
  };
  P.skip = function (s) {
    var v = this.video, r = this.range(); if (!r) return;
    v.currentTime = Math.min(r[1] - 0.5, Math.max(r[0], v.currentTime + s));
    this.flash((s > 0 ? "+" : "") + s + " ث");
  };
  P.toLive = function () {
    var r = this.range(); if (!r) return;
    this.video.currentTime = this.hls && this.hls.liveSyncPosition ? this.hls.liveSyncPosition : r[1] - 3;
    this.video.play().catch(function () {});
  };
  P.buildMenu = function () {
    var h = '<p>السرعة</p><div class="w2p-opts">';
    [0.5, 1, 1.25, 1.5, 2].forEach(function (s) { h += '<button data-sp="' + s + '" class="' + (this.speed === s ? "on" : "") + '">' + s + 'x</button>'; }, this);
    h += "</div>";
    if (this.hls && this.hls.levels.length > 1) {
      var cur = this.hls.autoLevelEnabled ? -1 : this.hls.currentLevel;
      h += '<p>الجودة</p><div class="w2p-opts"><button data-lv="-1" class="' + (cur === -1 ? "on" : "") + '">تلقائي</button>';
      var seen = {};
      this.hls.levels.map(function (l, k) { return { k: k, h: l.height || 0 }; }).sort(function (a, b) { return b.h - a.h; }).forEach(function (l) {
        var lab = l.h ? l.h + "p" : "جودة " + (l.k + 1);
        if (seen[lab]) return; seen[lab] = 1;
        h += '<button data-lv="' + l.k + '" class="' + (cur === l.k ? "on" : "") + '">' + lab + "</button>";
      });
      h += "</div>";
    }
    this.menu.innerHTML = h;
  };
  P.updateGear = function () {
    var lv = this.hls && this.hls.levels[this.hls.currentLevel];
    var hgt = lv && lv.height;
    this.gear.textContent = hgt ? (hgt >= 1080 ? "FHD" : hgt >= 720 ? "HD" : hgt + "p") : "⚙";
    this.info.textContent = hgt ? hgt + "p" + (this.hls.autoLevelEnabled ? " · تلقائي" : "") : "";
  };
  P.setState = function (s, msg) {
    this.root.dataset.state = s;
    if (s === "loading") this.state.innerHTML = '<div class="w2p-ring"></div>';
    else if (s === "error") this.state.innerHTML = '<div class="w2p-err"><p>' + (msg || "مش متاح دلوقتي") + "</p></div>";
    else if (s === "idle") { this.mode = "idle"; this.root.classList.remove("w2p-on", "w2p-embed"); this.state.innerHTML = IDLE; }
    else this.state.innerHTML = "";
  };
  P.sync = function () {
    var v = this.video;
    this.root.classList.toggle("w2p-paused", v.paused);
    this.root.querySelector('[data-a="play"]').innerHTML = I(v.paused ? "play" : "pause");
    this.root.querySelector('[data-a="mute"]').innerHTML = I(v.muted || v.volume === 0 ? "mute" : "volume");
    this.vol.style.setProperty("--p", (v.muted ? 0 : v.volume * 100) + "%");
    if (v.paused) this.poke && this.root.classList.add("w2p-show");
  };
  P.toggle = function () { var v = this.video; if (this.mode !== "video") return; if (v.paused) v.play().catch(function () {}); else v.pause(); };
  P.fullscreen = function () {
    var r = this.root;
    if (document.fullscreenElement) document.exitFullscreen();
    else if (r.requestFullscreen) r.requestFullscreen().then(function () { try { screen.orientation.lock("landscape").catch(function () {}); } catch (e) {} }).catch(function () {});
    else if (this.video.webkitEnterFullscreen) this.video.webkitEnterFullscreen();
  };
  P.destroy = function () {
    clearTimeout(this.timer);
    if (this.hls) { this.hls.destroy(); this.hls = null; }
    this.video.removeAttribute("src");
    this.video.load();
    this.frame.innerHTML = "";
    this.menu.hidden = true;
  };
  P.embed = function (item, url, label) {
    this.destroy();
    this.channel = null; this.item = item; this.mode = "embed"; this.unmute.hidden = true;
    this.root.classList.add("w2p-on", "w2p-embed");
    this.setState("loading");
    var self = this, f = document.createElement("iframe");
    f.src = url; f.allowFullscreen = true;
    f.setAttribute("allow", "autoplay; fullscreen; picture-in-picture; encrypted-media");
    f.setAttribute("referrerpolicy", "origin");
    f.onload = function () { if (self.item === item) self.setState(""); };
    this.frame.appendChild(f);
    this.timer = setTimeout(function () { if (self.item === item && self.root.dataset.state === "loading") self.setState(""); }, 8000);
  };
  P.load = function (ch) {
    this.item = null; this.channel = ch; this.mode = "video";
    this.title.textContent = ch.name;
    this.root.classList.remove("w2p-embed");
    this.root.classList.add("w2p-on");
    this.retried = false;
    this.tryUrl(0);
  };
  P.tryUrl = function (i) {
    var self = this, ch = this.channel, v = this.video;
    this.destroy();
    this.info.textContent = ""; this.gear.textContent = "⚙";
    if (i >= ch.urls.length) {
      this.setState("error", ch.geo ? "القناة دي محجوبة جغرافيا في بلدك" : "القناة مش متاحة دلوقتي، جرب قناة تانية");
      if (this.onfail) this.onfail(ch);
      return;
    }
    this.setState("loading");
    var url = ch.urls[i], done = false;
    function fail() {
      if (done || self.channel !== ch) return; done = true;
      if (!self.retried) { self.retried = true; self.tryUrl(i); return; }
      self.retried = false; self.tryUrl(i + 1);
    }
    this.timer = setTimeout(fail, 15000);
    v.addEventListener("playing", function ok() { done = true; clearTimeout(self.timer); v.removeEventListener("playing", ok); });
    v.playbackRate = this.speed;
    function start() { v.play().catch(function () { v.muted = true; v.play().catch(function () {}); }); }
    if (window.Hls && Hls.isSupported()) {
      var h = new Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 90, capLevelToPlayerSize: true, startLevel: -1, manifestLoadingMaxRetry: 1, levelLoadingMaxRetry: 2, fragLoadingMaxRetry: 3 });
      this.hls = h;
      h.loadSource(url);
      h.attachMedia(v);
      h.on(Hls.Events.MANIFEST_PARSED, start);
      h.on(Hls.Events.LEVEL_SWITCHED, function () { self.updateGear(); });
      h.on(Hls.Events.ERROR, function (e, d) {
        if (!d.fatal) return;
        if (d.type === Hls.ErrorTypes.MEDIA_ERROR && !h._rec) { h._rec = 1; h.recoverMediaError(); return; }
        fail();
      });
    } else {
      v.src = url;
      v.onerror = fail;
      start();
    }
  };
  window.W2GPlayer = W2GPlayer;
})();
