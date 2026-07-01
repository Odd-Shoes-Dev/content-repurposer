-- Separate subscriptions table so payment data is isolated from user-editable rows.
-- Users go through API routes that only touch the users table for name/email/password.
-- Only the webhook handler writes to this table.

CREATE TABLE IF NOT EXISTS subscriptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan                VARCHAR     NOT NULL DEFAULT 'free',
  status              VARCHAR     NOT NULL DEFAULT 'active',  -- active | cancelled | expired
  provider            VARCHAR     NOT NULL DEFAULT 'whop',
  provider_membership_id  VARCHAR,
  provider_plan_id        VARCHAR,
  activated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one active subscription per user at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_active
  ON subscriptions (user_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
  ON subscriptions (user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_membership_id
  ON subscriptions (provider_membership_id);

-- Seed every existing user with a free subscription row
INSERT INTO subscriptions (user_id, plan, status, provider)
SELECT id, COALESCE(plan, 'free'), 'active', 'whop'
FROM users
ON CONFLICT DO NOTHING;
