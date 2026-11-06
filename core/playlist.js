(function () {
  var SOURCES = [
    { id: "ara", label: "عربي" },
    { id: "eg", label: "مصر" },
    { id: "sa", label: "السعودية" },
    { id: "ae", label: "الإمارات" },
    { id: "kw", label: "الكويت" },
    { id: "qa", label: "قطر" },
    { id: "ma", label: "المغرب" },
    { id: "dz", label: "الجزائر" },
    { id: "tn", label: "تونس" },
    { id: "lb", label: "لبنان" },
    { id: "iq", label: "العراق" },
    { id: "sport", label: "رياضة عالمية" },
    { id: "news", label: "أخبار عالمية" },
    { id: "kids", label: "أطفال" },
    { id: "movies", label: "أفلام" }
  ];
  var CATS = { general: "عامة", news: "أخبار", sports: "رياضة", entertainment: "ترفيه", movies: "أفلام", series: "مسلسلات", kids: "أطفال", animation: "كرتون", music: "موسيقى", religious: "دينية", documentary: "وثائقية", culture: "ثقافة", education: "تعليم", business: "اقتصاد", lifestyle: "لايف ستايل", cooking: "طبخ", comedy: "كوميدي", family: "عائلية", travel: "سفر", science: "علوم", classic: "كلاسيك", legislative: "برلمانية", outdoor: "طبيعة", shop: "تسوق", weather: "طقس", auto: "سيارات", relax: "استرخاء", public: "عامة", undefined: "أخرى", other: "أخرى" };
  var cache = {};
  function clean(n) { return n.replace(/\s*\((\d+p|[^)]*)\)/g, "").replace(/\s*\[[^\]]*\]/g, "").trim(); }
  function catOf(g) {
    var first = (g || "undefined").split(";")[0].trim().toLowerCase();
    return { key: first, label: CATS[first] || g.split(";")[0] || "أخرى" };
  }
  function load(id) {
    if (cache[id]) return Promise.resolve(cache[id]);
    var data = window.W2G_CHANNELS || {};
    var list = (data[id] || []).map(function (c) { return { id: c.id, name: c.name, logo: c.logo, cat: catOf(c.group), geo: false, urls: c.urls }; });
    cache[id] = list;
    return Promise.resolve(list);
  }
  window.W2GPlaylist = { sources: SOURCES, load: load };
})();
