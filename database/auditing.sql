-- ============================================================
-- TRENDORA: AUDITING & BACKUPS
-- Run in pgAdmin Query Tool on the trendora database
-- ============================================================
-- Auditing automatically records every INSERT, UPDATE, DELETE
-- on critical tables. Answers: who changed what, and when.
-- ============================================================

-- STEP 1: The audit log table.
-- Every change to a watched table creates one row here.
CREATE TABLE audit_log (
    audit_id    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name  VARCHAR(100) NOT NULL,
    operation   VARCHAR(10)  NOT NULL,   -- INSERT / UPDATE / DELETE
    old_data    JSONB,                   -- row before the change
    new_data    JSONB,                   -- row after the change
    changed_by  TEXT         DEFAULT current_user,
    changed_at  TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

-- STEP 2: The trigger function.
-- PostgreSQL calls this automatically after any watched change.
-- It reads the OLD and NEW row values and writes them to audit_log.
CREATE OR REPLACE FUNCTION fn_audit_trigger()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, operation, new_data)
        VALUES (TG_TABLE_NAME, 'INSERT', row_to_json(NEW)::jsonb);

    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, operation, old_data, new_data)
        VALUES (TG_TABLE_NAME, 'UPDATE',
                row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);

    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, operation, old_data)
        VALUES (TG_TABLE_NAME, 'DELETE', row_to_json(OLD)::jsonb);
    END IF;
    RETURN NULL;
END;
$$;

-- STEP 3: Attach the trigger to the five most critical tables.
CREATE TRIGGER trg_audit_product
    AFTER INSERT OR UPDATE OR DELETE ON product
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_orders
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_payment
    AFTER INSERT OR UPDATE OR DELETE ON payment
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_customer
    AFTER INSERT OR UPDATE OR DELETE ON customer
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_inventory
    AFTER INSERT OR UPDATE OR DELETE ON inventory
    FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

-- ============================================================
-- VERIFY: Make any change to the product table, then run:
-- SELECT * FROM audit_log ORDER BY changed_at DESC LIMIT 10;
-- You should see one row per change.
--
-- BACKUP (run in terminal, not in pgAdmin):
-- pg_dump -U postgres trendora > trendora_backup_YYYYMMDD.sql
--
-- RESTORE:
-- psql -U postgres trendora < trendora_backup_YYYYMMDD.sql
--
-- IN PGADMIN: right-click the database > Backup / Restore
-- ============================================================
