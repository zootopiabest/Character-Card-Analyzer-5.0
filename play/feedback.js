import { REPORT_ENDPOINT } from './report-config.js';
const form = document.getElementById('playFlagForm');
if (form) {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const status = document.getElementById('playFlagStatus');
    const details = document.getElementById('playFlagDetails').value.trim();
    if (!details) { status.textContent = 'Describe the offensive or unsafe result.'; return; }
    if (!REPORT_ENDPOINT) {
      status.textContent = 'Reporting is not yet configured for this test build. Nothing was sent.';
      return;
    }
    if (!/^https:\/\//.test(REPORT_ENDPOINT)) {
      status.textContent = 'Reporting endpoint must use HTTPS.'; return;
    }
    status.textContent = 'Submitting report…';
    try {
      const response = await fetch(REPORT_ENDPOINT, {
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({kind:'ai_output',details:details.slice(0,4000),app:'Card Analyzer Android'})
      });
      if (!response.ok) throw Error('Report endpoint rejected the report.');
      status.textContent = 'Report submitted.';
      form.reset();
    } catch {
      status.textContent = 'Submission failed. No report was confirmed.';
    }
  });
}
