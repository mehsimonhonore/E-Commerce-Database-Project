-- ============================================================
-- TRENDORA: DATABASE SECURITY
-- Run in pgAdmin Query Tool on the trendora database
-- ============================================================
-- Principle of Least Privilege: each role gets only what it
-- needs. Nobody shares the superuser postgres account.
-- ============================================================

-- ── ROLE 1: Product Manager ───────────────────────────────
-- Can manage products and categories. Cannot touch payments.
CREATE ROLE product_manager LOGIN PASSWORD 'ProdMgr@Trendora2025';

GRANT SELECT, INSERT, UPDATE ON product    TO product_manager;
GRANT SELECT, INSERT, UPDATE ON categories TO product_manager;
GRANT SELECT, INSERT, UPDATE ON product_variants TO product_manager;
GRANT SELECT, INSERT, UPDATE ON product_images   TO product_manager;
GRANT SELECT                 ON vendor     TO product_manager;
REVOKE DELETE ON product FROM product_manager;

-- ── ROLE 2: Finance Admin ─────────────────────────────────
-- Read-only access to financial tables. Cannot modify anything.
CREATE ROLE finance_admin LOGIN PASSWORD 'Finance@Trendora2025';

GRANT SELECT ON payment        TO finance_admin;
GRANT SELECT ON orders         TO finance_admin;
GRANT SELECT ON order_items    TO finance_admin;
GRANT SELECT ON coupon_usages  TO finance_admin;
REVOKE INSERT, UPDATE, DELETE ON payment FROM finance_admin;

-- ── ROLE 3: Customer Support ──────────────────────────────
-- Can view customer and order info to assist users.
-- Cannot modify financial records.
CREATE ROLE support_staff LOGIN PASSWORD 'Support@Trendora2025';

GRANT SELECT ON customer   TO support_staff;
GRANT SELECT ON addresses  TO support_staff;
GRANT SELECT ON orders     TO support_staff;
GRANT SELECT ON reviews    TO support_staff;
REVOKE INSERT, UPDATE, DELETE ON customer FROM support_staff;
REVOKE INSERT, UPDATE, DELETE ON orders   FROM support_staff;

-- ── ENABLE LOGGING ────────────────────────────────────────
-- Records failed logins, connections, and schema changes.
-- Apply with: SELECT pg_reload_conf();  after running these.
ALTER SYSTEM SET logging_collector   = on;
ALTER SYSTEM SET log_connections     = on;
ALTER SYSTEM SET log_disconnections  = on;
ALTER SYSTEM SET log_failed_attempts = on;
ALTER SYSTEM SET log_statement       = 'ddl';

SELECT pg_reload_conf();

-- ============================================================
-- VERIFY ROLES: In pgAdmin expand Login/Group Roles.
-- TEST A ROLE: Open a new Query Tool connection using
-- product_manager credentials, then try:
--   DELETE FROM product WHERE prod_id = '...';
-- It should return: ERROR: permission denied for table product
-- ============================================================
