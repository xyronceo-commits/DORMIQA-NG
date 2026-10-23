/**
 * Orchestration tests for uploadHostelListing with an in-memory DB that mirrors the
 * Supabase RLS rules (agents may never write published/approved/isVerified=true).
 * Run: VITE_SUPABASE_URL=http://x VITE_SUPABASE_ANON_KEY=x npx tsx --test src/utils/uploadHostelListing.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { uploadHostelListing, UploadHostelListingError, UploadDeps, UploadProgress } from './uploadHostelListing';

const AGENT = '169a3df3-e3df-4e56-a797-887d0714f23e';
const ALLOWED = ['draft', 'uploading', 'upload_failed', 'incomplete', 'pending'];

function makeEnv(opts: { failOn?: Partial<Record<'read' | 'create' | 'photo' | 'video' | 'refs' | 'finalize', number>>; uid?: string | null } = {}) {
  const db = new Map<string, any>();
  const storage = new Set<string>();
  const failures = { ...(opts.failOn || {}) };
  const writes: string[] = [];
  const consume = (k: keyof typeof failures) => { if ((failures[k] || 0) > 0) { failures[k]!--; return true; } return false; };
  const deps: UploadDeps = {
    getCurrentUserId: async () => (opts.uid === undefined ? AGENT : opts.uid),
    getListing: async (id) => { if (consume('read')) throw new Error('read failed'); return db.has(id) ? structuredClone(db.get(id)) : null; },
    saveListing: async (id, data) => {
      const prev = db.get(id) || {};
      const next = { ...prev, ...data };
      // mirror of the live RLS WITH CHECK
      if (!ALLOWED.includes(next.status ?? 'pending') || !ALLOWED.includes(next.verificationStatus ?? 'pending') || next.isVerified === true) {
        throw new Error('new row violates row-level security policy for table "app_documents"');
      }
      const phase = data.status === 'pending' ? 'finalize' : Array.isArray(data.photos) && data.photos.length > 0 ? 'refs' : !db.has(id) ? 'create' : null;
      if (phase && consume(phase as any)) throw new Error(`${phase} write failed`);
      db.set(id, next);
      writes.push(`${id}:${next.status}`);
    },
    uploadPhoto: async (_s, listingId, i, onBytes) => {
      if (consume('photo')) throw new Error('Storage upload failed (500)');
      onBytes(5, 10); onBytes(10, 10);
      storage.add(`listings/${listingId}/photo_${i}.jpg`);
      return `https://cdn/listings/${listingId}/photo_${i}.jpg?v=1`;
    },
    uploadVideo: async (_s, listingId, onPct) => {
      if (consume('video')) throw new Error('Video upload failed');
      onPct(50); onPct(100);
      storage.add(`listings/${listingId}/video.mp4`);
      return `https://cdn/listings/${listingId}/video.mp4?v=1`;
    },
    afterSubmit: () => {},
  };
  return { db, storage, deps, writes };
}

const base = (over: any = {}) => ({
  listingId: 'lst_test_1', hostelName: 'Test Lodge', universityId: 'uniosun', universityName: 'UNIOSUN',
  propertyType: 'self_contain' as const, pricePerYear: 300000, address: 'Olaiya, near Gate', agentId: AGENT,
  photos: ['https://example.com/a.jpg', 'https://example.com/b.jpg'], videoSource: 'https://example.com/v.mp4', ...over,
});
// photos given as URLs would pass through the real uploader; in these tests the fake uploader is used for everything.

test('happy path: media saved, status pending, never published/verified, 100% only at the end', async () => {
  const env = makeEnv();
  const progress: UploadProgress[] = [];
  const out = await uploadHostelListing(base({ onProgress: (p: UploadProgress) => progress.push(p) }), env.deps);
  const row = env.db.get('lst_test_1');
  assert.equal(out.status, 'pending');
  assert.equal(row.status, 'pending');
  assert.equal(row.verificationStatus, 'pending');
  assert.equal(row.isVerified, false);
  assert.equal(row.photos.length, 2);
  assert.match(row.videoUrl, /video\.mp4/);
  assert.equal(env.db.size, 1);
  assert.ok(!env.writes.some((w) => /published|approved/.test(w)));
  const hundreds = progress.filter((p) => p.progressPercent === 100);
  assert.equal(hundreds.length, 1);
  assert.equal(progress[progress.length - 1].progressPercent, 100);
  const pcts = progress.map((p) => p.progressPercent);
  assert.deepEqual(pcts, [...pcts].sort((a, b) => a - b), 'progress never goes backwards');
});

test('validation: no photos / wrong signed-in user / signed out', async () => {
  await assert.rejects(uploadHostelListing(base({ photos: [] }), makeEnv().deps), (e: any) => e instanceof UploadHostelListingError && e.step === 'validation');
  await assert.rejects(uploadHostelListing(base(), makeEnv({ uid: 'someone-else' }).deps), (e: any) => e.step === 'validation');
  await assert.rejects(uploadHostelListing(base(), makeEnv({ uid: null }).deps), (e: any) => e.step === 'validation');
});

test('DB failure while creating the record -> metadata_creation, nothing uploaded, retry works', async () => {
  const env = makeEnv({ failOn: { create: 1 } });
  await assert.rejects(uploadHostelListing(base(), env.deps), (e: any) => e.step === 'metadata_creation');
  assert.equal(env.storage.size, 0);
  assert.equal(env.db.size, 0);
  await uploadHostelListing(base(), env.deps);
  assert.equal(env.db.size, 1);
});

test('Storage failure -> media_upload, draft kept as upload_failed, retry resumes same record, no duplicate files', async () => {
  const env = makeEnv({ failOn: { photo: 1 } });
  await assert.rejects(uploadHostelListing(base(), env.deps), (e: any) => e.step === 'media_upload' && /Storage upload failed/.test(e.message));
  assert.equal(env.db.get('lst_test_1').status, 'upload_failed');
  assert.equal(env.db.get('lst_test_1').isVerified, false);
  await uploadHostelListing(base(), env.deps);
  assert.equal(env.db.size, 1, 'retry must not create a second listing');
  assert.equal(env.db.get('lst_test_1').status, 'pending');
  assert.equal(env.storage.size, 3, 'deterministic paths: 2 photos + 1 video, no duplicates');
});

test('failure while saving media references -> media_reference_save; retry succeeds', async () => {
  const env = makeEnv({ failOn: { refs: 1 } });
  await assert.rejects(uploadHostelListing(base(), env.deps), (e: any) => e.step === 'media_reference_save');
  assert.notEqual(env.db.get('lst_test_1').status, 'pending');
  await uploadHostelListing(base(), env.deps);
  assert.equal(env.db.size, 1);
  assert.equal(env.db.get('lst_test_1').photos.length, 2);
});

test('failure while finalizing (RLS) -> finalizing, media already saved, retry succeeds, one record', async () => {
  const env = makeEnv({ failOn: { finalize: 1 } });
  await assert.rejects(uploadHostelListing(base(), env.deps), (e: any) => e.step === 'finalizing');
  assert.equal(env.db.get('lst_test_1').photos.length, 2, 'valid media is retained');
  await uploadHostelListing(base(), env.deps);
  assert.equal(env.db.size, 1);
  assert.equal(env.db.get('lst_test_1').status, 'pending');
});

test('RLS refusal is reported as a security-policy message, not swallowed', async () => {
  const env = makeEnv();
  const orig = env.deps.saveListing;
  env.deps.saveListing = async (id, d) => { if (d.status === 'pending') throw new Error('new row violates row-level security policy for table "app_documents"'); return orig(id, d); };
  await assert.rejects(uploadHostelListing(base(), env.deps), (e: any) => e.step === 'finalizing' && /security policy/.test(e.message));
});

test('double submit after success is idempotent (no new writes, no new files)', async () => {
  const env = makeEnv();
  await uploadHostelListing(base(), env.deps);
  const writesBefore = env.writes.length;
  const again = await uploadHostelListing(base(), env.deps);
  assert.equal(again.status, 'pending');
  assert.equal(env.writes.length, writesBefore);
  assert.equal(env.storage.size, 3);
});

test('an admin-moderated listing cannot be re-submitted by the agent', async () => {
  const env = makeEnv();
  env.db.set('lst_test_1', { id: 'lst_test_1', status: 'approved', agentId: AGENT, photos: ['x'] });
  await assert.rejects(uploadHostelListing(base(), env.deps), (e: any) => e.step === 'metadata_creation' && /approved/.test(e.message));
});
