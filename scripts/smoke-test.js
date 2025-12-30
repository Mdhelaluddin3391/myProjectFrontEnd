// scripts/smoke-test.js
// Headless smoke test using Puppeteer
// Visits a set of pages, captures console logs, page errors, request failures and checks for presence of globals.

const fs = require('fs');
const puppeteer = require('puppeteer');

const PORT = process.env.PORT || 8000;
const HOST = `http://127.0.0.1:${PORT}`;

const pagesToTest = [
  { name: 'Home', path: '/index.html', setLocalStorage: { access_token: 'dummy_token', user_address_text: 'Test Address' } },
  { name: 'Auth', path: '/auth.html', setLocalStorage: {} },
  { name: 'Checkout', path: '/checkout.html', setLocalStorage: { access_token: 'dummy_token', user_address_text: 'Test Address' } },
  { name: 'Track Order', path: '/track_order.html?id=12345', setLocalStorage: { access_token: 'dummy_token', user_address_text: 'Test Address' } },
  { name: 'Not Serviceable', path: '/not_serviceable.html', setLocalStorage: {} }
];

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const results = [];

  for (const info of pagesToTest) {
    const page = await browser.newPage();

    // Set required localStorage before any script runs on page
    await page.evaluateOnNewDocument((store) => {
      for (const k of Object.keys(store || {})) {
        localStorage.setItem(k, store[k]);
      }
    }, info.setLocalStorage);

    const consoleMsgs = [];
    const pageErrors = [];
    const requestFailures = [];

    // Intercept network requests and mock API responses to make smoke tests deterministic
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const url = req.url();
      const method = req.method();

      // Only mock API calls (URLs containing '/api/' or '/auth/' or '/assistant/')
      if (/\/api\//.test(url) || /\/auth\//.test(url) || /\/assistant\//.test(url) || /\/orders\//.test(url) || /\/notifications\//.test(url) || /\/locations\//.test(url) || /\/warehouse\//.test(url)) {
        try {
          const respondJson = (status, obj, extraHeaders = {}) => {
            const headers = Object.assign({ 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, extraHeaders);
            req.respond({ status: status, headers: headers, body: JSON.stringify(obj) });
          };

          // Handle CORS preflight OPTIONS requests
          if (method === 'OPTIONS') {
            return req.respond({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS', 'Access-Control-Allow-Headers': '*', 'Content-Length': '0' }, body: '' });
          }

          // Simple router for mocked endpoints
          if (url.includes('/api/config')) {
            return respondJson(200, { keys: { google_maps: 'REPLACE' }, maintenance_mode: false });
          }

          if (url.includes('/orders/cart/') && method === 'GET') {
            return respondJson(200, { items: [], total_amount: 0 });
          }

          if (url.includes('/auth/customer/addresses/')) {
            if (method === 'GET') return respondJson(200, []);
            if (method === 'POST') return respondJson(201, { id: 1, label: 'Home' });
          }

          if (url.includes('/catalog/home/feed/')) {
            return respondJson(200, { sections: [ { category_name: 'Top Picks', products: [ { sku: 'sku1', name: 'Milk', sale_price: 50, image_url: '' } ] } ] });
          }

          if (url.includes('/catalog/banners/')) return respondJson(200, []);
          if (url.includes('/catalog/categories/')) return respondJson(200, []);
          if (url.includes('/catalog/brands/')) return respondJson(200, []);
          if (url.includes('/catalog/flash-sales/')) return respondJson(200, []);

          if (url.includes('/locations/geocode/')) {
            return respondJson(200, { display_name: 'Test Address, Test City', address: { city: 'Test City', postcode: '560001', suburb: 'Test Suburb' } });
          }

          if (url.includes('/notifications/send-otp/')) return respondJson(200, { success: true, message: 'OTP sent' });

          if (url.includes('/auth/register/customer/')) return respondJson(200, { access: 'fake_access_token', refresh: 'fake_refresh_token' });

          if (url.includes('/auth/me/')) return respondJson(200, { id: 'u1', first_name: 'Test', phone: '+911234567890' });

          if (url.includes('/warehouse/find-serviceable/')) return respondJson(200, { serviceable: true, warehouse: { id: 1 } });

          if (url.includes('/orders/create/')) return respondJson(200, { order: { id: 'ord123' } });

          if (url.includes('/auth/ws/ticket/')) return respondJson(200, { ticket: 'fake-ticket-uuid' });

          if (url.includes('/assistant/chat/')) return respondJson(200, { reply: 'Hi! This is a test reply.', action: null });

          if (url.includes('/orders/cart/add/')) return respondJson(200, { success: true, cart_size: 1 });

        } catch (e) {
          // If mock handling fails, fallback to continuing the request
          consoleMsgs.push({ type: 'error', text: 'Mock handler error: ' + (e.message || e) });
        }
      }

      // Allow other requests to proceed normally
      req.continue();
    });

    page.on('console', msg => {
      const args = msg.args();
      const text = msg.text();
      consoleMsgs.push({ type: msg.type(), text });
    });

    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    page.on('requestfailed', req => {
      requestFailures.push({ url: req.url(), errorText: req.failure() ? req.failure().errorText : 'unknown' });
    });

    const url = HOST + info.path;
    console.log(`Visiting: ${info.name} -> ${url}`);

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    } catch (e) {
      // Navigation may fail or timeout; capture error
      pageErrors.push(`Navigation failed: ${e.message}`);
    }

    // Give some time for lazy-loaded scripts and timers
    await new Promise(r => setTimeout(r, 2000));

    // Capture presence of globals (robust to navigation during evaluation)
    let globals = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        globals = await page.evaluate(() => ({
          ApiService: typeof window.ApiService !== 'undefined',
          Toast: typeof window.Toast !== 'undefined',
          Formatters: typeof window.Formatters !== 'undefined',
          LocationPicker: typeof window.LocationPicker !== 'undefined',
          L: typeof window.L !== 'undefined',
          Razorpay: typeof window.Razorpay !== 'undefined',
          google: typeof window.google !== 'undefined'
        }));
        break;
      } catch (e) {
        // Execution context destroyed due to navigation — wait and retry
        await new Promise(r => setTimeout(r, 500));
      }
    }
    if (!globals) {
      globals = { ApiService: false, Toast: false, Formatters: false, LocationPicker: false, L: false, Razorpay: false, google: false };
    }

    // Take a small screenshot for visual verification (optional)
    const screenshotPath = `./tmp/${info.name.replace(/\s+/g,'_')}.png`;
    try { fs.mkdirSync('./tmp', { recursive: true }); await page.screenshot({ path: screenshotPath, fullPage: false }); } catch (e) { /* ignore */ }

    results.push({
      page: info.name,
      url,
      console: consoleMsgs,
      pageErrors,
      requestFailures,
      globals,
      screenshot: fs.existsSync(screenshotPath) ? screenshotPath : null
    });

    await page.close();
  }

  await browser.close();

  fs.writeFileSync('./tmp/smoke-report.json', JSON.stringify({ runAt: new Date().toISOString(), results }, null, 2));
  console.log('Smoke test completed. Report saved to ./tmp/smoke-report.json');
})();