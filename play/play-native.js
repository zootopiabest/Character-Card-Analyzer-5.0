/* Browser side of branch-only Android networking and document export. */
if (globalThis.AndroidHttp) {
  const originalFetch = globalThis.fetch.bind(globalThis);
  let nextId = 0;
  const pending = new Map();
  globalThis.__playNativeResponse = (id, status, body, error) => {
    const item = pending.get(id);
    if (!item) return;
    pending.delete(id);
    item.signal?.removeEventListener('abort', item.abort);
    if (error || status < 200 || status > 599) {
      item.reject(new TypeError(error || 'Invalid provider response.'));
      return;
    }
    item.resolve(new Response(body, {status, headers:{'Content-Type':'application/json'}}));
  };
  globalThis.fetch = (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    if (url.origin === location.origin) return originalFetch(input, init);
    if (url.protocol !== 'https:') return Promise.reject(new TypeError('Only HTTPS providers are allowed in the Android app.'));
    const method = (init.method || 'GET').toUpperCase();
    if (!['GET', 'POST'].includes(method)) return Promise.reject(new TypeError('Unsupported HTTP method.'));
    const headers = Object.fromEntries(new Headers(init.headers || {}).entries());
    const body = typeof init.body === 'string' ? init.body : '';
    const signal = init.signal;
    if (signal?.aborted) return Promise.reject(signal.reason || new DOMException('Aborted','AbortError'));
    return new Promise((resolve, reject) => {
      const id = 'p' + (++nextId);
      const abort = () => {
        pending.delete(id);
        signal?.removeEventListener('abort', abort);
        AndroidHttp.cancel(id);
        reject(signal.reason || new DOMException('Aborted', 'AbortError'));
      };
      pending.set(id, {resolve, reject, signal, abort});
      signal?.addEventListener('abort', abort, {once:true});
      AndroidHttp.request(id, method, url.href, JSON.stringify(headers), body);
    });
  };
  // The actual Android app is installed and updated through Google Play.
  addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('installApp');
    if (button) button.hidden = true;
  });
}
