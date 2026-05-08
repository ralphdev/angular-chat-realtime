-- ============================================================
-- SCHEMA: Real-time Chat App
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username   TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- ============================================================
-- TABLE: messages
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    TEXT,
  image_url  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT messages_content_or_image CHECK (
    content IS NOT NULL OR image_url IS NOT NULL
  )
);

-- Index for feed queries (newest first)
CREATE INDEX IF NOT EXISTS idx_messages_created_at_desc
  ON public.messages(created_at DESC);

-- Index for user message lookups
CREATE INDEX IF NOT EXISTS idx_messages_user_id
  ON public.messages(user_id);

-- ============================================================
-- RLS: profiles
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read profiles
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can only insert their own profile
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- ============================================================
-- RLS: messages
-- ============================================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read messages
CREATE POLICY "messages_select_authenticated"
  ON public.messages FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert their own messages
CREATE POLICY "messages_insert_authenticated"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Only the owner can update their messages
CREATE POLICY "messages_update_own"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Only the owner can delete their messages
CREATE POLICY "messages_delete_own"
  ON public.messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      split_part(NEW.email, '@', 1)
    )
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STORAGE: chat-images bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
  VALUES ('chat-images', 'chat-images', true)
  ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload
CREATE POLICY "chat_images_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-images');

-- Public read access
CREATE POLICY "chat_images_select"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'chat-images');

-- Owner can delete
CREATE POLICY "chat_images_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'chat-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- REALTIME: enable publications
-- ============================================================
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE public.messages, public.profiles;
