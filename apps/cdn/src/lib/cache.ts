export const IMMUTABLE = 'public, max-age=31536000, immutable';
export const POINTER = 'public, s-maxage=300, stale-while-revalidate=86400';
export const JS_CONTENT_TYPE = 'application/javascript; charset=utf-8';

// Short TTL on 404s so a freshly-promoted widget doesn't appear broken to
// clients who hit the bundle URL during the publish→promote window.
export const NOT_FOUND_CACHE = 'public, max-age=60';
