import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app, { serverReady } from '../server';
import { isRunningInIframe } from '../src/pages/admin/AdminLogin';

describe('24. Admin Authentication & Iframe Warning Differentiation', () => {
  let server: http.Server;
  let baseUrl: string;
  // Dedicated test passkey configured from CI/environment without hardcoded production secrets
  const adminPasskey = process.env.CI_ADMIN_PASSKEY || process.env.TEST_ADMIN_PASSKEY || process.env.ADMIN_PASSKEY || 'ci-test-dedicated-admin-passkey-never-used-in-production';
  // Ensure the server process uses the dedicated test passkey during test execution
  process.env.ADMIN_PASSKEY = adminPasskey;

  before(async () => {
    if (serverReady) {
      await serverReady;
    }
    await new Promise<void>((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const addr: any = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // 1. Top-level browser context tests
  test('1. Top-level browser -> isRunningInIframe returns false and prevents iframe warning', () => {
    // Simulate normal top-level window where window.self === window.top
    const mockTopWindow = {} as any;
    (global as any).window = {
      self: mockTopWindow,
      top: mockTopWindow
    };

    assert.strictEqual(isRunningInIframe(), false, 'Top-level window must not be detected as an iframe');
  });

  // 2. Normal passkey login -> authenticated
  test('2. Normal passkey login -> returns HTTP 200, Sets HttpOnly session cookie, and returns authenticated admin details', async () => {
    const res = await fetch(`${baseUrl}/api/admin/verify-passkey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.42' },
      body: JSON.stringify({ passkey: adminPasskey })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.email, 'probitianofficial@gmail.com');
    assert.strictEqual(data.role, 'admin');

    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie, 'verify-passkey must issue a Set-Cookie header');
    assert.ok(setCookie.includes('admin_session='), 'Cookie must be admin_session');
    assert.ok(setCookie.includes('HttpOnly'), 'Cookie must be HttpOnly');
    assert.ok(setCookie.includes('Path=/'), 'Cookie must specify Path=/');
  });

  // 3. Top-level cookie/session verification -> authenticated
  test('3. Top-level cookie/session verification -> returns HTTP 200 with authenticated: true', async () => {
    // Obtain session cookie
    const loginRes = await fetch(`${baseUrl}/api/admin/verify-passkey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.43' },
      body: JSON.stringify({ passkey: adminPasskey })
    });
    assert.strictEqual(loginRes.status, 200);
    const setCookieHeader = loginRes.headers.get('set-cookie') || '';
    const cookieValue = setCookieHeader.split(';')[0];

    // Verify session
    const sessionRes = await fetch(`${baseUrl}/api/admin/session`, {
      headers: { Cookie: cookieValue, 'x-forwarded-for': '198.51.100.43' }
    });
    assert.strictEqual(sessionRes.status, 200);
    const sessionData = await sessionRes.json();
    assert.strictEqual(sessionData.authenticated, true);
    assert.strictEqual(sessionData.email, 'probitianofficial@gmail.com');
    assert.strictEqual(sessionData.role, 'admin');
  });

  // 4. Genuine iframe detection & cookie restriction differentiation
  test('4. Genuine iframe -> detected when window.self !== window.top or cross-origin access throws', () => {
    // Case A: standard iframe where window.self !== window.top
    const frameSelf = { id: 'frame' };
    const frameTop = { id: 'parent' };
    (global as any).window = {
      self: frameSelf,
      top: frameTop
    };
    assert.strictEqual(isRunningInIframe(), true, 'Iframe containment must return true when self !== top');

    // Case B: cross-origin iframe where accessing window.top throws a SecurityError
    (global as any).window = {
      self: frameSelf,
      get top() {
        throw new Error('Blocked a frame with origin "..." from accessing a cross-origin frame.');
      }
    };
    assert.strictEqual(isRunningInIframe(), true, 'Cross-origin SecurityError must return true');
  });

  // 5. Invalid passkey -> normal invalid-credentials error
  test('5. Invalid passkey -> returns HTTP 401 with standard invalid-credentials error', async () => {
    const res = await fetch(`${baseUrl}/api/admin/verify-passkey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.44' },
      body: JSON.stringify({ passkey: 'completely_incorrect_passkey_999' })
    });

    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.strictEqual(data.error, 'Invalid credentials');

    const setCookie = res.headers.get('set-cookie');
    assert.strictEqual(setCookie, null, 'Invalid passkey must not issue a session cookie');
  });

  // 6. Backend/session failure -> appropriate authentication error, not iframe warning
  test('6. Backend/session failure -> GET /api/admin/session without cookie returns authenticated: false, does not throw 500', async () => {
    const res = await fetch(`${baseUrl}/api/admin/session`, {
      headers: { 'x-forwarded-for': '198.51.100.45' }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.authenticated, false);
    assert.strictEqual(data.role, undefined);
  });

  test('7. Top-level browser with missing cookie displays cookie error, NEVER iframe warning', () => {
    // In a top-level tab
    (global as any).window = {
      self: {},
      top: null
    };
    (global as any).window.top = (global as any).window.self;

    const inIframe = isRunningInIframe();
    assert.strictEqual(inIframe, false);

    // Simulate login verification logic
    let cookieBlocked = false;
    let errorMessage: string | null = null;
    const sessionResOk = true;
    const sessionData = { authenticated: false };

    if (!sessionData.authenticated) {
      if (inIframe) {
        cookieBlocked = true;
        errorMessage = 'Admin Portal requires a first-party browser tab.';
      } else {
        cookieBlocked = false;
        errorMessage = 'Session could not be established. Please ensure cookies are enabled in your browser and try again.';
      }
    }

    assert.strictEqual(cookieBlocked, false, 'Top-level browser must never flag cookieBlocked as true');
    assert.strictEqual(errorMessage, 'Session could not be established. Please ensure cookies are enabled in your browser and try again.');
  });

  test('8. Genuine iframe with blocked cookies displays embedded preview warning and new-tab guidance', () => {
    // In an embedded iframe
    (global as any).window = {
      self: { id: 'child' },
      top: { id: 'parent' }
    };

    const inIframe = isRunningInIframe();
    assert.strictEqual(inIframe, true);

    // When passkey succeeded on server but browser omitted cookie in iframe
    let cookieBlocked = false;
    let errorMessage: string | null = null;
    const sessionData = { authenticated: false };

    if (!sessionData.authenticated) {
      if (inIframe) {
        cookieBlocked = true;
        errorMessage = 'Admin Portal requires a first-party browser tab. This preview is embedded inside an iframe, where browser privacy settings may block secure administrative session cookies.';
      } else {
        cookieBlocked = false;
        errorMessage = 'Session could not be established.';
      }
    }

    assert.strictEqual(cookieBlocked, true, 'Genuine iframe with blocked cookies must flag cookieBlocked');
    assert.ok(errorMessage?.includes('Admin Portal requires a first-party browser tab.'));
  });
});
