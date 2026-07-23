-- ============================================================================
--  invitation-media: hard per-file size ceiling (12 MB)
--
--  Uploads now go DIRECT to Storage via signed upload URLs (see
--  src/editor/lib/uploadFile.ts), bypassing the serverless function that used
--  to enforce the size limit inline. Set a bucket-level file_size_limit as the
--  un-bypassable backstop so a crafted client cannot push arbitrarily large
--  files past the app's declared limit. 12 MB == MAX_AUDIO_BYTES.
--
--  The app additionally enforces per-type limits (5 MB image / 12 MB audio) on
--  the real stored bytes in /api/upload/verify.
-- ============================================================================
update storage.buckets
set file_size_limit = 12582912 -- 12 * 1024 * 1024
where id = 'invitation-media';
