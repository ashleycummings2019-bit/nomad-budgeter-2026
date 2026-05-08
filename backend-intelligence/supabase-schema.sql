-- ╔══════════════════════════════════════════════╗
-- ║     SUPABASE SCHEMA — NomadBudgeter Swarm     ║
-- ║     Run this in the Supabase SQL Editor        ║
-- ╚══════════════════════════════════════════════╝

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════
-- Table 1: Agent Findings Queue
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS swarm_findings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_type      TEXT NOT NULL CHECK (agent_type IN ('researcher', 'auditor', 'writer')),
  country_slug    TEXT NOT NULL,
  city_slug       TEXT,
  finding_type    TEXT NOT NULL CHECK (finding_type IN ('tax_change', 'visa_update', 'col_shift', 'treaty_change', 'blog_draft')),
  current_value   JSONB,
  proposed_value  JSONB NOT NULL,
  source_url      TEXT,
  confidence      FLOAT DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ
);

-- Index for quick pending lookups
CREATE INDEX IF NOT EXISTS idx_findings_status ON swarm_findings (status, confidence DESC);
CREATE INDEX IF NOT EXISTS idx_findings_country ON swarm_findings (country_slug);

-- ═══════════════════════════════════════
-- Table 2: Swarm Execution Logs
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS swarm_runs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_type        TEXT NOT NULL CHECK (run_type IN ('tax_scan', 'content_gen', 'col_audit', 'audit', 'full_pipeline')),
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  agents_used     INTEGER DEFAULT 1,
  tokens_input    INTEGER DEFAULT 0,
  tokens_output   INTEGER DEFAULT 0,
  cost_usd        FLOAT DEFAULT 0,
  findings_count  INTEGER DEFAULT 0,
  status          TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed'))
);

-- Index for recent runs
CREATE INDEX IF NOT EXISTS idx_runs_status ON swarm_runs (status, started_at DESC);

-- ═══════════════════════════════════════
-- Table 3: Alert Subscriptions (MRR Product)
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS alert_subscriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email      TEXT NOT NULL,
  countries       TEXT[] NOT NULL DEFAULT '{}',
  stripe_sub_id   TEXT,
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index for active subscriber lookups
CREATE INDEX IF NOT EXISTS idx_alerts_active ON alert_subscriptions (active) WHERE active = true;

-- ═══════════════════════════════════════
-- Row Level Security (lock it down)
-- ═══════════════════════════════════════
ALTER TABLE swarm_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE swarm_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_subscriptions ENABLE ROW LEVEL SECURITY;

-- Service role (backend) can do everything
CREATE POLICY "Service role full access" ON swarm_findings
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON swarm_runs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON alert_subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- ═══════════════════════════════════════
-- Handy views for the review dashboard
-- ═══════════════════════════════════════

-- Pending findings ordered by confidence
CREATE OR REPLACE VIEW pending_review AS
SELECT
  id,
  agent_type,
  country_slug,
  city_slug,
  finding_type,
  proposed_value->>'summary' AS summary,
  confidence,
  source_url,
  created_at
FROM swarm_findings
WHERE status = 'pending'
ORDER BY confidence DESC, created_at DESC;

-- Daily cost tracking
CREATE OR REPLACE VIEW daily_costs AS
SELECT
  DATE(started_at) AS run_date,
  COUNT(*) AS runs,
  SUM(tokens_input) AS total_tokens_in,
  SUM(tokens_output) AS total_tokens_out,
  SUM(cost_usd) AS total_cost,
  SUM(findings_count) AS total_findings
FROM swarm_runs
WHERE status = 'completed'
GROUP BY DATE(started_at)
ORDER BY run_date DESC;
