(function () {
  var SERVERS = [
    { id: "xyz", label: "سيرفر 1", movie: function (id, k) { return "https://vidsrc.xyz/embed/movie?" + k + "=" + id; }, tv: function (id, s, e, k) { return "https://vidsrc.xyz/embed/tv?" + k + "=" + id + "&s=" + s + "&e=" + e; } },
    { id: "to", label: "سيرفر 2", movie: function (id) { return "https://vidsrc.to/embed/movie/" + id; }, tv: function (id, s, e) { return "https://vidsrc.to/embed/tv/" + id + "/" + s + "/" + e; } },
    { id: "me", label: "سيرفر 3", movie: function (id, k) { return "https://vidsrc.me/embed/movie?" + k + "=" + id; }, tv: function (id, s, e, k) { return "https://vidsrc.me/embed/tv?" + k + "=" + id + "&season=" + s + "&episode=" + e; } }
  ];
  var C = window.W2G_CATALOG || { movies: [], series: [] };
  function title(x) { return x.ar || x.en; }
  window.W2GVod = {
    servers: SERVERS,
    movies: C.movies,
    series: C.series,
    title: title,
    url: function (server, item, s, e) {
      var sv = SERVERS.filter(function (x) { return x.id === server; })[0] || SERVERS[0];
      var id = item.imdb || item.tmdb, k = item.imdb ? "imdb" : "tmdb";
      return item.type === "t" ? sv.tv(id, s || 1, e || 1, k) : sv.movie(id, k);
    },
    extra: {},
    search: function (q, type) {
      var self = this;
      return fetch("https://v3.sg.media-imdb.com/suggestion/x/" + encodeURIComponent(q.trim().toLowerCase().slice(0, 60)) + ".json").then(function (r) { return r.json(); }).then(function (j) {
        var want = type === "t" ? /^tv(Series|MiniSeries)$/ : /^movie$/;
        return (j.d || []).filter(function (r) { return /^tt/.test(r.id) && want.test(r.qid); }).map(function (r) {
          var x = { id: type + r.id, imdb: r.id, tmdb: r.id, type: type, cat: "search", ar: "", en: r.l, y: r.y ? String(r.y) : "", p: r.i ? r.i.imageUrl.replace("._V1_.jpg", "._V1_QL75_UX300_.jpg") : "" };
          self.extra[x.id] = x; return x;
        });
      });
    },
    find: function (id) { if (this.extra[id]) return this.extra[id]; return C.movies.concat(C.series).filter(function (x) { return x.id === id; })[0]; },
    custom: function (raw, type) {
      var t = String(raw).match(/tt\d{5,10}/);
      if (t) return { id: type + t[0], imdb: t[0], tmdb: t[0], type: type, cat: "custom", ar: (type === "t" ? "مسلسل " : "فيلم ") + t[0], en: "", y: "" };
      var m = String(raw).match(/(\d{2,9})/);
      if (!m) return null;
      return { id: type + m[1], tmdb: m[1], type: type, cat: "custom", ar: (type === "t" ? "مسلسل" : "فيلم") + " رقم " + m[1], en: "", y: "" };
    }
  };
})();
