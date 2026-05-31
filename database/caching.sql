-- ============================================================
-- TRENDORA: CACHING WITH MATERIALIZED VIEWS
-- Run in pgAdmin Query Tool on the trendora database
-- ============================================================
-- A materialized view pre-computes an expensive JOIN query
-- and stores the result as a real table on disk.
-- The backend reads this table instead of re-running the JOIN
-- every single time. Refresh it on a schedule to keep it fresh.
-- ============================================================

-- VIEW 1: Featured products with vendor + category info
-- Replaces a 3-table JOIN on every product page load.
-- Refresh: every 1 hour.
CREATE MATERIALIZED VIEW mv_featured_products AS
SELECT
    p.prod_id,
    p.prod_name,
    p.price,
    p.prod_description,
    c.cat_name,
    v.vendor_name,
    v.brand_name
FROM product p
JOIN categories c ON p.cat_id   = c.cat_id
JOIN vendor     v ON p.vendor_id = v.vendor_id
WHERE p.price IS NOT NULL;

CREATE UNIQUE INDEX ON mv_featured_products (prod_id);


-- VIEW 2: Category list with product counts
-- Refresh: every 6 hours.
CREATE MATERIALIZED VIEW mv_category_summary AS
SELECT
    c.cat_id,
    c.cat_name,
    COUNT(p.prod_id) AS product_count
FROM categories c
LEFT JOIN product p ON p.cat_id = c.cat_id
GROUP BY c.cat_id, c.cat_name;

CREATE UNIQUE INDEX ON mv_category_summary (cat_id);


-- VIEW 3: Daily sales totals for admin dashboard
-- Refresh: every 24 hours.
CREATE MATERIALIZED VIEW mv_daily_sales AS
SELECT
    DATE(placed_at)       AS sale_date,
    COUNT(order_id)       AS total_orders,
    SUM(total_amount)     AS total_revenue
FROM orders
WHERE order_status != 'cancelled'
GROUP BY DATE(placed_at)
ORDER BY sale_date DESC;


-- VIEW 4: Top vendors ranked by order volume
-- Refresh: every 6 hours.
CREATE MATERIALIZED VIEW mv_top_vendors AS
SELECT
    v.vendor_id,
    v.vendor_name,
    v.brand_name,
    COUNT(DISTINCT o.order_id)          AS total_orders,
    SUM(oi.unit_price * oi.quantity)    AS total_revenue
FROM vendor v
JOIN product          p  ON p.vendor_id   = v.vendor_id
JOIN product_variants pv ON pv.prod_id    = p.prod_id
JOIN order_items      oi ON oi.prod_var_id= pv.prod_var_id
JOIN orders           o  ON o.order_id    = oi.order_id
GROUP BY v.vendor_id, v.vendor_name, v.brand_name
ORDER BY total_orders DESC;

CREATE UNIQUE INDEX ON mv_top_vendors (vendor_id);


-- ============================================================
-- REFRESH COMMANDS (run manually or schedule with pg_cron)
-- CONCURRENTLY = old data stays available during refresh
-- ============================================================
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_featured_products;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_category_summary;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_sales;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_vendors;

-- ============================================================
-- VERIFY: Schemas > public > Materialized Views in pgAdmin.
-- Test: SELECT * FROM mv_featured_products LIMIT 5;
-- ============================================================
