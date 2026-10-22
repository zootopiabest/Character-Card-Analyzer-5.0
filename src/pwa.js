// Separate from the audit entry point so install/update support remains available
// even if provider settings or another optional feature cannot initialize.
export function initPwa() {
  const install = document.getElementById('installApp');
  const notice = document.getElementById('pwaNotice');
  const message = document.getElementById('pwaMessage');
  const update = document.getElementById('updateApp');
  const standalone = window.matchMedia('(display-mode: standalone)');
  let installPrompt = null, registration = null, reloadRequested = false;
  const installed = () => standalone.matches || navigator.standalone === true;
  function show(text) { message.textContent = text; notice.hidden = false; }
  function syncInstall() { install.hidden = installed(); }
  syncInstall();
  standalone.addEventListener?.('change', syncInstall);
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); installPrompt = event; syncInstall();
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null; install.hidden = true;
    if (!registration?.waiting) notice.hidden = true;
  });
  install.addEventListener('click', async () => {
    if (!installPrompt) {
      show('Open your browser menu and choose “Install app” or “Add to Home screen”. On iPhone or iPad, use Safari’s Share menu → Add to Home Screen. If you opened this inside another app, open it in your browser first.');
      return;
    }
    const prompt = installPrompt; installPrompt = null; install.disabled = true;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === 'accepted') install.hidden = true;
    } catch {
      show('Use your browser menu → Install app or Add to Home screen to install Analyzer 5.');
    } finally { install.disabled = false; }
  });
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Never refresh another open tab, a live request, or unsaved work automatically.
    if (reloadRequested) window.location.reload();
  });
  function offerUpdate() {
    if (!registration?.waiting) return;
    show('An update is ready. Finish your audit and save any cards or reports you need before reloading.');
    update.hidden = false;
  }
  update.addEventListener('click', () => {
    if (document.getElementById('analyzeButton')?.disabled) {
      show('Your audit is still running. Reload to update after it finishes.');
      return;
    }
    if (!registration?.waiting) { window.location.reload(); return; }
    reloadRequested = true;
    registration.waiting.postMessage({type:'SKIP_WAITING'});
  });
  navigator.serviceWorker.register(new URL('../sw.js', import.meta.url), {
    scope:new URL('../', import.meta.url).href, updateViaCache:'none'
  }).then(reg => {
    registration = reg;
    offerUpdate();
    function watch(worker) {
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed') offerUpdate();
      });
    }
    watch(reg.installing);
    reg.addEventListener('updatefound', () => watch(reg.installing));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    });
  }).catch(() => {
    // Do not block ordinary online audits when offline storage is unavailable.
    show('Offline setup could not finish. The online analyzer still works; reopen it while connected to retry.');
  });
}

if (typeof document !== 'undefined' && !globalThis.AndroidHttp) initPwa();
