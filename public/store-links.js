/**
 * Store listings for the native apps. URLs live in site-config.json
 * (storeLinks.{ios,android}) — the single source.
 *  - About page: "Get the app" buttons (hidden inside the native apps).
 *  - index.html: slim dismissible "Get the app" banner on phone-sized mobile web.
 */
(function () {
  var DISMISS_KEY = "nextTrainStoreBannerDismissed";

  function isNativeApp() {
    try {
      return Boolean(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
    } catch (e) {
      return false;
    }
  }

  function loadLinks() {
    return fetch("/site-config.json", { cache: "no-store" })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (c) {
        return (c && c.storeLinks) || null;
      })
      .catch(function () {
        return null;
      });
  }

  function mobilePlatform() {
    var ua = navigator.userAgent || "";
    if (/iPhone|iPad|iPod/i.test(ua)) {
      return "ios";
    }
    if (/Android/i.test(ua)) {
      return "android";
    }
    return null;
  }

  function dismissed() {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch (e) {
      return true; // storage unavailable: stay hidden
    }
  }

  function initAboutSection() {
    if (isNativeApp()) {
      return;
    }
    loadLinks().then(function (links) {
      if (!links || isNativeApp()) {
        return;
      }
      var any = false;
      ["ios", "android"].forEach(function (key) {
        var a = document.getElementById("store-link-" + key);
        if (a && links[key]) {
          a.href = links[key];
          a.hidden = false;
          any = true;
        }
      });
      var section = document.getElementById("store-links-section");
      if (section && any) {
        section.hidden = false;
      }
    });
  }

  function initBanner() {
    var platform = mobilePlatform();
    if (isNativeApp() || !platform || window.innerWidth >= 768 || dismissed()) {
      return;
    }
    loadLinks().then(function (links) {
      var url = links && links[platform];
      var host = document.querySelector("main.app");
      if (!url || !host || isNativeApp() || document.getElementById("store-banner")) {
        return;
      }
      var bar = document.createElement("aside");
      bar.id = "store-banner";
      bar.className = "store-banner";
      bar.setAttribute("aria-label", "Get the app");
      var text = document.createElement("span");
      text.className = "store-banner-text";
      text.textContent = "Next Train is on " + (platform === "ios" ? "the App Store" : "Google Play");
      var link = document.createElement("a");
      link.className = "store-banner-link";
      link.id = "store-banner-link";
      link.href = url;
      link.rel = "noopener";
      link.textContent = "Get the app";
      var close = document.createElement("button");
      close.type = "button";
      close.className = "store-banner-dismiss";
      close.id = "store-banner-dismiss";
      close.setAttribute("aria-label", "Dismiss");
      close.textContent = "×";
      close.addEventListener("click", function () {
        try {
          localStorage.setItem(DISMISS_KEY, "1");
        } catch (e) {}
        bar.remove();
      });
      bar.appendChild(text);
      bar.appendChild(link);
      bar.appendChild(close);
      host.insertBefore(bar, host.firstChild);
    });
  }

  window.nextTrainStoreLinks = { initAboutSection: initAboutSection, initBanner: initBanner };
})();
