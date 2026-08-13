-- ============================================================
-- RescueNet — Volunteer Module migration 001
-- Custom resource categories on resource requests
-- ============================================================
-- Run this once against the shared database (pgAdmin 4 Query Tool
-- or psql). Both statements are additive and idempotent, so an
-- existing database keeps all of its data.
--
-- NOTE: ALTER TYPE ... ADD VALUE cannot run inside a transaction
-- block. Run the two statements separately — do not wrap them in
-- BEGIN/COMMIT.
-- ============================================================

-- 1. A fifth resource category for supplies that do not fit
--    WATER / FOOD / MEDICINE / HYGIENE (generators, tooling, etc).
ALTER TYPE resource_type ADD VALUE IF NOT EXISTS 'OTHER';

-- 2. Preserves the category wording the volunteer actually typed.
--    Without this the enum flattens every custom category to
--    'OTHER' and the original label is lost.
ALTER TABLE Resource ADD COLUMN IF NOT EXISTS custom_category VARCHAR(60);
