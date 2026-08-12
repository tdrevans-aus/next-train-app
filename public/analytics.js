(function initAnalytics() {
  const native = window.NextTrainAnalyticsNative;

  function track(name, props) {
    if (typeof native?.track === "function") {
      native.track(name, props);
    }
  }

  window.NextTrainAnalytics = { track };
})();
