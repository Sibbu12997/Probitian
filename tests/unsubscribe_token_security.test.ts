import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
  validateUnsubscribeSecretConfig,
} from '../server/security/tokens';

const validSecret = '0123456789abcdef0123456789abcdef';

test('unsubscribe token security requires a dedicated secret and validates HMACs', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousSecret = process.env.UNSUBSCRIBE_SECRET;
  const previousSessionSecret = process.env.SESSION_SECRET;

  try {
    process.env.NODE_ENV = 'production';
    delete process.env.UNSUBSCRIBE_SECRET;
    process.env.SESSION_SECRET = 'session-secret-that-must-not-be-used';

    assert.throws(() => validateUnsubscribeSecretConfig(), /UNSUBSCRIBE_SECRET/);
    assert.throws(() => generateUnsubscribeToken('person@example.com'), /UNSUBSCRIBE_SECRET/);
    assert.equal(verifyUnsubscribeToken('cGVyc29uQGV4YW1wbGUuY29t.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'), null);

    process.env.UNSUBSCRIBE_SECRET = 'too-short';
    assert.throws(() => validateUnsubscribeSecretConfig(), /UNSUBSCRIBE_SECRET/);

    process.env.UNSUBSCRIBE_SECRET = validSecret;
    validateUnsubscribeSecretConfig();

    const token = generateUnsubscribeToken(' Person@Example.com ');
    assert.equal(verifyUnsubscribeToken(token), 'person@example.com');

    const [encodedEmail, digest] = token.split('.');
    assert.equal(verifyUnsubscribeToken(`${encodedEmail}.${'a'.repeat(32)}`), null);
    assert.equal(verifyUnsubscribeToken(`${encodedEmail}.${digest.toUpperCase()}`), null);
    assert.equal(verifyUnsubscribeToken(`${encodedEmail}.${digest}extra`), null);
    assert.equal(verifyUnsubscribeToken('not-a-token'), null);

    process.env.UNSUBSCRIBE_SECRET = 'abcdef0123456789abcdef0123456789';
    assert.equal(verifyUnsubscribeToken(token), null);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;

    if (previousSecret === undefined) delete process.env.UNSUBSCRIBE_SECRET;
    else process.env.UNSUBSCRIBE_SECRET = previousSecret;

    if (previousSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSessionSecret;
  }
});
