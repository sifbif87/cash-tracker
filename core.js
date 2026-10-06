/* moite-pari-core v2
   Логиката на обвивката. Тегли се сама от GitHub, не изисква ново APK. */
(function () {
  var APP_KEY = "moite-pari-app-cache";
  var frame = document.getElementById("app");
  var barTop = document.querySelector(".bar-top"), barBottom = document.querySelector(".bar-bottom");
  var shown = null, okSeen = false, timer = null;

  function valid(h) { return typeof h === "string" && h.length > 2000 && h.indexOf("moite-pari-app") !== -1; }
  function isHex(s) { return typeof s === "string" && /^#[0-9a-fA-F]{6}$/.test(s); }

  /* Цветът на лентите горе и долу следва фона на приложението. */
  function applyBars(top, bottom) {
    barTop.style.background = top; barBottom.style.background = bottom;
    document.documentElement.style.background = top; document.body.style.background = top;
    frame.style.background = top;
  }
  try {
    var saved = JSON.parse(localStorage.getItem("moite-pari-bars") || "null");
    if (saved && isHex(saved.top) && isHex(saved.bottom)) applyBars(saved.top, saved.bottom);
  } catch (e) {}

  /* Ако ядрото е стартирало и преди (при връщане към вградената версия), махаме стария слушател. */

  /* Мрежови заявки на приложението (към борси). Минават през родния слой, за да няма CORS. Само позволени хостове. */
  var NET_OK = /^https:\/\/(api[0-9]?\.binance\.com|api\.kraken\.com|api\.coinbase\.com|api\.coingecko\.com)\//;
  function netReply(id, o) { o.t = "http-res"; o.id = id; try { frame.contentWindow.postMessage(o, "*"); } catch (x) {} }
  function netProxy(d) {
    var url = String(d.url || "");
    if (!NET_OK.test(url)) { netReply(d.id, { err: "blocked host" }); return; }
    var method = String(d.method || "GET").toUpperCase(), headers = d.headers || {}, body = d.body || null;
    function viaFetch() {
      return fetch(url, { method: method, headers: headers, body: body || undefined })
        .then(function (r) { return r.text().then(function (tx) { netReply(d.id, { status: r.status, text: tx }); }); })
        .catch(function (e) { netReply(d.id, { err: String(e && e.message || e) }); });
    }
    var H = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorHttp;
    if (!(H && H.request)) { viaFetch(); return; }
    var data = body;
    if (body && /x-www-form-urlencoded/i.test(JSON.stringify(headers))) {
      data = {}; new URLSearchParams(body).forEach(function (v, k) { data[k] = v; });
    }
    var p = H.request({ url: url, method: method, headers: headers, data: data, responseType: "text" });
    p.then(function (r) {
      netReply(d.id, { status: r.status, text: typeof r.data === "string" ? r.data : JSON.stringify(r.data) });
    }).catch(function () { viaFetch(); });
  }

  if (window.__moiteMsg) window.removeEventListener("message", window.__moiteMsg);
  window.__moiteMsg = function (e) {
    if (e.source !== frame.contentWindow) return;
    var d = e.data;
    if (d === "moite-pari-ok") { okSeen = true; return; }
    if (d && d.t === "http-ping") { try { frame.contentWindow.postMessage({ t: "http-pong" }, "*"); } catch (x) {} return; }
    if (d && d.t === "http") { netProxy(d); return; }
    if (d && d.t === "theme" && isHex(d.top) && isHex(d.bottom)) {
      applyBars(d.top, d.bottom);
      try { localStorage.setItem("moite-pari-bars", JSON.stringify({ top: d.top, bottom: d.bottom })); } catch (x) {}
      try {
        var sb = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SystemBars;
        if (sb && sb.setStyle) { var p = sb.setStyle({ style: d.light ? "LIGHT" : "DARK" }); if (p && p.catch) p.catch(function () {}); }
      } catch (x) {}
    }
  };
  window.addEventListener("message", window.__moiteMsg);

  function show(html, watch) {
    shown = html; okSeen = false;
    frame.srcdoc = html;
    clearTimeout(timer);
    if (watch) {
      /* Ако новата версия не стартира, връщаме вградената. */
      timer = setTimeout(function () {
        if (okSeen) return;
        try { localStorage.removeItem(APP_KEY); } catch (e) {}
        loadBundled();
      }, 6000);
    }
  }
  function loadBundled() {
    fetch("app.html").then(function (r) { return r.text(); }).then(function (h) {
      if (valid(h)) show(h, false);
    });
  }

  var cached = null;
  try { cached = localStorage.getItem(APP_KEY); } catch (e) {}
  if (valid(cached)) show(cached, true); else loadBundled();

  /* Проверка за нова версия на приложението на заден план. */
  fetch(RAW + "app.html?t=" + Date.now(), { cache: "no-store" })
    .then(function (r) { return r.ok ? r.text() : Promise.reject(); })
    .then(function (h) {
      if (!valid(h)) return;
      try { localStorage.setItem(APP_KEY, h); } catch (e) {}
      if (h !== shown) show(h, true);
    })
    .catch(function () {});

  window.__moiteCoreOk = true;
})();
