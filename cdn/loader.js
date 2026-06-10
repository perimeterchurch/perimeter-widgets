/* Perimeter Widgets global loader.
 * Usage: <script src="https://widgets.perimeter.org/loader.js" async></script>
 * Mounts every <div data-perimeter-widget="<name>"> on the page by lazy-loading
 * only the bundles actually present, each once. */
(function () {
  if (window.__perimeterLoader) return;
  window.__perimeterLoader = true;

  var origin =
    document.currentScript && document.currentScript.src
      ? new URL('.', document.currentScript.src).href
      : '/';

  fetch(origin + 'manifest.json', { cache: 'no-cache' })
    .then(function (r) {
      return r.json();
    })
    .then(function (manifest) {
      var seen = {};
      function scan() {
        var nodes = document.querySelectorAll('[data-perimeter-widget]');
        for (var i = 0; i < nodes.length; i++) {
          var name = nodes[i].getAttribute('data-perimeter-widget');
          if (!name || seen[name]) continue;
          var version = manifest[name];
          if (!version) continue; // unknown widget — skip silently (guest on someone's page)
          seen[name] = true;
          var s = document.createElement('script');
          s.async = true;
          s.src = origin + name + '/' + version + '/index.js'; // immutable, 1yr-cached
          document.head.appendChild(s);
        }
      }
      // With an async <script> in <head>, the manifest fetch can resolve
      // mid-parse — before placeholder divs lower in the body exist. Scan now
      // for whatever has been parsed, and rescan once the DOM is complete
      // (`seen` dedupes); each bundle's own MutationObserver covers anything
      // added after that.
      scan();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scan);
      }
    })
    .catch(function () {
      /* fail silently — never break the host page */
    });
})();
