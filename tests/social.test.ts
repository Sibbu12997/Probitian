import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { 
  DEFAULT_SOCIAL_LINKS, 
  PROBITIAN_X_URL, 
  PROBITIAN_X_HANDLE, 
  PROBITIAN_YOUTUBE_URL,
  PROBITIAN_INSTAGRAM_URL,
  PROBITIAN_FACEBOOK_URL,
  PROBITIAN_GITHUB_URL,
  PROBITIAN_LINKEDIN_URL,
  PROBITIAN_CONTACT_EMAIL 
} from '../src/constants/branding';

describe('Official Social Channels & Contact Connections', () => {
  test('official X configuration is correctly defined with target URL and handle', () => {
    assert.strictEqual(PROBITIAN_X_URL, 'https://x.com/Probitian');
    assert.strictEqual(PROBITIAN_X_HANDLE, '@Probitian');
  });

  test('DEFAULT_SOCIAL_LINKS contains all 7 official channels in correct display order', () => {
    assert.strictEqual(DEFAULT_SOCIAL_LINKS.length, 7);

    const platforms = DEFAULT_SOCIAL_LINKS.map(s => s.platform);
    assert.deepStrictEqual(platforms, [
      'youtube',
      'instagram',
      'facebook',
      'github',
      'email',
      'linkedin',
      'x'
    ]);

    const xEntry = DEFAULT_SOCIAL_LINKS.find(s => s.platform === 'x');
    assert.ok(xEntry, 'X entry must exist in DEFAULT_SOCIAL_LINKS');
    assert.strictEqual(xEntry.url, 'https://x.com/Probitian');
    assert.strictEqual(xEntry.icon, 'X');
    assert.strictEqual(xEntry.is_active, true);
    assert.strictEqual(xEntry.display_order, 7);
  });

  test('all 6 core platforms (YouTube, Instagram, Facebook, GitHub, Email, LinkedIn) remain present and active', () => {
    const youtube = DEFAULT_SOCIAL_LINKS.find(s => s.platform === 'youtube');
    const instagram = DEFAULT_SOCIAL_LINKS.find(s => s.platform === 'instagram');
    const facebook = DEFAULT_SOCIAL_LINKS.find(s => s.platform === 'facebook');
    const github = DEFAULT_SOCIAL_LINKS.find(s => s.platform === 'github');
    const email = DEFAULT_SOCIAL_LINKS.find(s => s.platform === 'email');
    const linkedin = DEFAULT_SOCIAL_LINKS.find(s => s.platform === 'linkedin');

    assert.strictEqual(youtube?.url, PROBITIAN_YOUTUBE_URL);
    assert.strictEqual(instagram?.url, PROBITIAN_INSTAGRAM_URL);
    assert.strictEqual(facebook?.url, PROBITIAN_FACEBOOK_URL);
    assert.strictEqual(github?.url, PROBITIAN_GITHUB_URL);
    assert.strictEqual(email?.url, `mailto:${PROBITIAN_CONTACT_EMAIL}`);
    assert.strictEqual(linkedin?.url, PROBITIAN_LINKEDIN_URL);
  });
});
