-- =====================================================================
-- Migration 00006: Allow fractional delay_hours in sequence steps
--
-- The AI campaign architect generates SMS/email delays like 0.1 (6 min)
-- or 0.25 (15 min) which were rejected by the INTEGER column type.
-- NUMERIC(10, 4) gives us 4 decimal precision (down to 0.36 seconds).
-- =====================================================================

ALTER TABLE email_sequence_steps
    ALTER COLUMN delay_hours TYPE NUMERIC(10, 4) USING delay_hours::numeric;

ALTER TABLE sms_sequence_steps
    ALTER COLUMN delay_hours TYPE NUMERIC(10, 4) USING delay_hours::numeric;

NOTIFY pgrst, 'reload schema';
