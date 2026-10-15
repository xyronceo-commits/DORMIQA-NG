/**
 * Unit tests for src/utils/session.ts
 * Covers test cases:
 * 1. A stale stored entry (30 hours old) plus a fresh last_sign_in_at is valid.
 * 2. A stale stored entry is replaced by the new sign-in time.
 * 3. last_sign_in_at 13 hours ago is expired. 11 hours ago is valid.
 * 4. Calling the set function repeatedly does not move the start time.
 * 5. With no server time and no stored time, the session is valid.
 * 6. With no server time and a 20-hour-old stored time, the session is expired.
 * 7. A start time one minute in the future is valid.
 */

// Mock browser localStorage
const memoryStore = new Map<string, string>();
const fakeLocalStorage = {
  getItem: (key: string) => memoryStore.get(key) || null,
  setItem: (key: string, val: string) => memoryStore.set(key, val),
  removeItem: (key: string) => memoryStore.delete(key),
  clear: () => memoryStore.clear(),
  get length() { return memoryStore.size; },
  key: (i: number) => Array.from(memoryStore.keys())[i] || null
};

(globalThis as any).window = globalThis;
(globalThis as any).localStorage = fakeLocalStorage;

import {
  checkUserSessionValid,
  setUserSessionTimestamp,
  getStoredSession,
  USER_SESSION_DURATION_MS
} from './session';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`FAIL: ${msg}`);
  }
  console.log(`PASS: ${msg}`);
}

function runSessionTests() {
  console.log('--- Running session.ts unit tests ---');
  const now = 1700000000000; // Fixed timestamp
  const testUid = 'user_test_123';

  // Test 1: Stale stored entry (30 hours old) + fresh last_sign_in_at is valid.
  fakeLocalStorage.clear();
  const thirtyHoursAgo = now - (30 * 60 * 60 * 1000);
  fakeLocalStorage.setItem(`dormiqa_user_session_${testUid}`, JSON.stringify({
    uid: testUid,
    loginTime: thirtyHoursAgo,
    expiresAt: thirtyHoursAgo + USER_SESSION_DURATION_MS
  }));
  const freshServerTime = new Date(now - 1000 * 60 * 5).toISOString(); // 5 mins ago
  const valid1 = checkUserSessionValid(testUid, { last_sign_in_at: freshServerTime }, now);
  assert(valid1 === true, 'Test 1: Stale stored entry (30 hours old) + fresh last_sign_in_at is valid');

  // Test 2: A stale stored entry is replaced by the new sign-in time.
  const storedAfterCheck = getStoredSession(testUid);
  assert(
    storedAfterCheck !== null && storedAfterCheck.loginTime === new Date(freshServerTime).getTime(),
    'Test 2: A stale stored entry is replaced by the new sign-in time in localStorage'
  );

  // Test 3: last_sign_in_at 13 hours ago is expired. 11 hours ago is valid.
  const thirteenHoursAgo = new Date(now - (13 * 60 * 60 * 1000)).toISOString();
  const validThirteen = checkUserSessionValid(testUid, { last_sign_in_at: thirteenHoursAgo }, now);
  assert(validThirteen === false, 'Test 3a: last_sign_in_at 13 hours ago is expired');

  const elevenHoursAgo = new Date(now - (11 * 60 * 60 * 1000)).toISOString();
  const validEleven = checkUserSessionValid(testUid, { last_sign_in_at: elevenHoursAgo }, now);
  assert(validEleven === true, 'Test 3b: last_sign_in_at 11 hours ago is valid');

  // Test 4: Calling the set function repeatedly does not move the start time.
  fakeLocalStorage.clear();
  const initialTime = now;
  setUserSessionTimestamp(testUid, { last_sign_in_at: new Date(initialTime).toISOString() }, initialTime);
  const record1 = getStoredSession(testUid);
  assert(record1?.loginTime === initialTime, 'Test 4a: Initial set records initial login time');

  // Simulate refresh 30 minutes later with same last_sign_in_at
  const thirtyMinsLater = initialTime + 30 * 60 * 1000;
  setUserSessionTimestamp(testUid, { last_sign_in_at: new Date(initialTime).toISOString() }, thirtyMinsLater);
  const record2 = getStoredSession(testUid);
  assert(record2?.loginTime === initialTime, 'Test 4b: Calling set function repeatedly does not move start time');

  // Test 5: With no server time and no stored time, the session is valid.
  fakeLocalStorage.clear();
  const validEmpty = checkUserSessionValid('brand_new_user', null, now);
  assert(validEmpty === true, 'Test 5: With no server time and no stored time, session is valid');

  // Test 6: With no server time and a 20-hour-old stored time, the session is expired.
  fakeLocalStorage.clear();
  const twentyHoursAgo = now - (20 * 60 * 60 * 1000);
  fakeLocalStorage.setItem(`dormiqa_user_session_${testUid}`, JSON.stringify({
    uid: testUid,
    loginTime: twentyHoursAgo,
    expiresAt: twentyHoursAgo + USER_SESSION_DURATION_MS
  }));
  const validOldStored = checkUserSessionValid(testUid, null, now);
  assert(validOldStored === false, 'Test 6: With no server time and 20-hour-old stored time, session is expired');

  // Test 7: A start time one minute in the future is valid (tolerates clock differences).
  fakeLocalStorage.clear();
  const oneMinuteFuture = new Date(now + 60 * 1000).toISOString();
  const validFuture = checkUserSessionValid(testUid, { last_sign_in_at: oneMinuteFuture }, now);
  assert(validFuture === true, 'Test 7: A start time one minute in the future is valid');

  console.log('ALL 7 SESSION UNIT TESTS PASSED SUCCESSFULLY!');
}

runSessionTests();
