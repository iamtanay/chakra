/*
  # Push Notification Subscriptions

  Stores Web Push subscription objects per user.
  Designed for up to ~10 users (one subscription per user per device).

  ## Table: push_subscriptions
  - id              — surrogate PK
  - user_id         — FK → auth.users (the Supabase authenticated user)
  - endpoint        — the browser-assigned push endpoint URL (unique per device)
  - p256dh          — client public key (base64url)
  - auth            — auth secret (base64url)
  - user_agent      — optional device label (e.g. "iPhone Safari")
  - created_at      — when the subscription was registered
  - updated_at      — last upsert (subscription can be refreshed by the browser)

  ## RLS
  - Users can only read/write their own subscription rows.
  - The Vercel cron route will use the service_role key (bypasses RLS)
    to fan-out notifications to every subscribed user.

  ## Design choices for multi-user
  - user_id + endpoint are a unique pair: the same user can have multiple
    devices, but the same endpoint can only belong to one user.
  - UNIQUE(endpoint) prevents duplicate registrations from race conditions.
*/

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    text        NOT NULL,
  p256dh      text        NOT NULL,
  auth        text        NOT NULL,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT push_subscriptions_endpoint_unique UNIQUE (endpoint)
);

-- Index for fast lookup by user (fan-out per user)
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON push_subscriptions (user_id);

-- Auto-update updated_at on upsert
CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_push_subscriptions_updated_at();

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can register and manage their own subscriptions
CREATE POLICY "Users manage own push subscriptions"
  ON push_subscriptions FOR ALL
  TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
