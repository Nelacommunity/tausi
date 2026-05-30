-- ============================================================
-- Tausi Storage Setup
-- Run this in the Supabase SQL Editor AFTER schema.sql
-- ============================================================

-- ── 1. Create the bucket ─────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exam-papers',
  'exam-papers',
  false,                    -- private bucket (no public URLs)
  52428800,                 -- 50 MB per file
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ── 2. Storage RLS policies ──────────────────────────────────

-- Users can upload files only into their own folder  {user_id}/...
CREATE POLICY "users upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exam-papers'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Any authenticated user can read any file
-- (paths are non-guessable: user_id + timestamp + filename)
CREATE POLICY "authenticated users read files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'exam-papers'
);

-- Users can replace (overwrite) files in their own folder
CREATE POLICY "users update own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'exam-papers'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete files in their own folder
CREATE POLICY "users delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'exam-papers'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
