-- ============================================================
-- TRENDORA: GIN INDEXES FOR FULL-TEXT SEARCH
-- Run in pgAdmin Query Tool on the trendora database
-- ============================================================

-- Step 1: Enable the trigram extension.
-- This powers fuzzy matching (e.g. "hoodi" finds "hoodie").
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Step 2: Product name search
CREATE INDEX idx_gin_product_name
    ON product
    USING GIN (prod_name gin_trgm_ops);

-- Step 3: Product description search
CREATE INDEX idx_gin_product_description
    ON product
    USING GIN (prod_description gin_trgm_ops);

-- Step 4: Vendor name search
CREATE INDEX idx_gin_vendor_name
    ON vendor
    USING GIN (vendor_name gin_trgm_ops);

-- Step 5: Category name search
CREATE INDEX idx_gin_category_name
    ON categories
    USING GIN (cat_name gin_trgm_ops);

-- Step 6: Coupon code search
CREATE INDEX idx_gin_coupon_code
    ON coupons
    USING GIN (code gin_trgm_ops);

-- ============================================================
-- VERIFY: In pgAdmin expand:
-- trendora > Schemas > public > Tables > product > Indexes
-- You should see idx_gin_product_name listed.
-- ============================================================
