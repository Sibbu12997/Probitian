import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  COOKIE_CONSENT_KEY,
  COOKIE_CONSENT_VERSION_KEY,
  CURRENT_CONSENT_VERSION,
  getCookieConsent,
  setCookieConsent,
  hasUserConsentChoice,
  hasOptionalConsent,
  subscribeToConsentChanges
} from '../src/lib/cookieConsent';

// In-memory localStorage mock for node environment
class MockLocalStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

// Simple event target mock for CustomEvent in Node
class MockEventTarget {
  private listeners: Map<string, Function[]> = new Map();

  addEventListener(type: string, listener: Function) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);
  }

  removeEventListener(type: string, listener: Function) {
    const list = this.listeners.get(type);
    if (!list) return;
    this.listeners.set(type, list.filter(l => l !== listener));
  }

  dispatchEvent(event: any) {
    const list = this.listeners.get(event.type);
    if (list) {
      list.forEach(listener => listener(event));
    }
    return true;
  }
}

describe('Cookie & Privacy Consent Manager', () => {
  beforeEach(() => {
    (global as any).localStorage = new MockLocalStorage();
    const eventTarget = new MockEventTarget();
    (global as any).window = {
      localStorage: (global as any).localStorage,
      addEventListener: eventTarget.addEventListener.bind(eventTarget),
      removeEventListener: eventTarget.removeEventListener.bind(eventTarget),
      dispatchEvent: eventTarget.dispatchEvent.bind(eventTarget)
    };
    (global as any).CustomEvent = class CustomEvent {
      type: string;
      detail: any;
      constructor(type: string, params?: { detail?: any }) {
        this.type = type;
        this.detail = params?.detail;
      }
    };
  });

  test('default state before user interaction has no consent and optional tracking is blocked', () => {
    assert.strictEqual(getCookieConsent(), null);
    assert.strictEqual(hasUserConsentChoice(), false);
    assert.strictEqual(hasOptionalConsent(), false);
  });

  test('selecting "necessary" only enables essential cookies and blocks optional tracking', () => {
    setCookieConsent('necessary');
    assert.strictEqual(getCookieConsent(), 'necessary');
    assert.strictEqual(hasUserConsentChoice(), true);
    assert.strictEqual(hasOptionalConsent(), false);
    assert.strictEqual(localStorage.getItem(COOKIE_CONSENT_KEY), 'necessary');
    assert.strictEqual(localStorage.getItem(COOKIE_CONSENT_VERSION_KEY), CURRENT_CONSENT_VERSION);
  });

  test('selecting "all" enables optional tracking and records choice', () => {
    setCookieConsent('all');
    assert.strictEqual(getCookieConsent(), 'all');
    assert.strictEqual(hasUserConsentChoice(), true);
    assert.strictEqual(hasOptionalConsent(), true);
    assert.strictEqual(localStorage.getItem(COOKIE_CONSENT_KEY), 'all');
    assert.strictEqual(localStorage.getItem(COOKIE_CONSENT_VERSION_KEY), CURRENT_CONSENT_VERSION);
  });

  test('version mismatch requires renewed user choice', () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'all');
    localStorage.setItem(COOKIE_CONSENT_VERSION_KEY, '0.9.0'); // outdated version

    assert.strictEqual(getCookieConsent(), null);
    assert.strictEqual(hasUserConsentChoice(), false);
    assert.strictEqual(hasOptionalConsent(), false);
  });

  test('consent updates trigger subscription callbacks', () => {
    let notifiedChoice: string | null = null;
    const unsubscribe = subscribeToConsentChanges((choice) => {
      notifiedChoice = choice;
    });

    setCookieConsent('all');
    assert.strictEqual(notifiedChoice, 'all');

    setCookieConsent('necessary');
    assert.strictEqual(notifiedChoice, 'necessary');

    unsubscribe();
  });
});
