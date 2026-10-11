/*
# Profile Avatar Storage and Bio Column

## 1. New Storage Bucket
- Create a public storage bucket named `avatars` for user profile pictures.
- File size limit: 2MB.
- Allowed MIME types: image/jpeg, image/png, image/webp, image/gif.

## 2. Storage Policies
- SELECT (read): public — anyone can view avatar images (TO anon, authenticated).
- INSERT (upload): authenticated users can only upload to a folder named after their own user ID.
- UPDATE: authenticated users can only update files in their own folder.
- DELETE: authenticated users can only delete files in their own folder.

## 3. Profile Table Change
- Add `bio` text column to `profiles` (nullable, max 160 chars via app validation).
- This column is included in the safe self-update columns (avatar_url is already allowed).

## Security
- The storage INSERT/UPDATE/DELETE policies use auth.uid() matching the folder path prefix,
  so users can only manage files in their own user-id-prefixed folder.
- The profiles_update_self policy already allows updating avatar_url and other safe columns;
  bio will be included since the policy uses a column-agnostic ownership check (auth.uid() = id).
*/

-- ============================================================
-- 1. Create avatars storage bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. Storage RLS policies for avatars bucket
-- ============================================================

-- Anyone can read avatar images (public bucket)
DROP POLICY IF EXISTS "avatar_select_public" ON storage.objects;
CREATE POLICY "avatar_select_public"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'avatars');

-- Authenticated users can upload to their own folder (path = <user_id>/filename)
DROP POLICY IF EXISTS "avatar_insert_own" ON storage.objects;
CREATE POLICY "avatar_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Authenticated users can update their own folder
DROP POLICY IF EXISTS "avatar_update_own" ON storage.objects;
CREATE POLICY "avatar_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Authenticated users can delete from their own folder
DROP POLICY IF EXISTS "avatar_delete_own" ON storage.objects;
CREATE POLICY "avatar_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================
-- 3. Add bio column to profiles
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'bio'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN bio text;
  END IF;
END $$;
