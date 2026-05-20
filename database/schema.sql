CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ==========================================
-- LEVEL 1: Independent Tables
-- ==========================================

CREATE TABLE customer (
    customer_id  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name   VARCHAR(50)  NOT NULL,
    last_name    VARCHAR(50)  NOT NULL,
    email        VARCHAR(255) NOT NULL UNIQUE,
    phone_num    VARCHAR(20)  NOT NULL,
    created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vendor (
    vendor_id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_name         VARCHAR(255) NOT NULL,
    vendor_name        VARCHAR(255) NOT NULL,
    vendor_email       VARCHAR(255) NOT NULL UNIQUE,
    telephone_num      VARCHAR(13)  NOT NULL UNIQUE,
    business_address   TEXT         NOT NULL,
    is_verified        BOOLEAN      DEFAULT FALSE,
    created_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    cat_id    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    cat_name  VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE coupons (
    coupon_id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    code                 VARCHAR(50) NOT NULL UNIQUE,
    description          TEXT,
    discount_type        VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value       INT         NOT NULL CHECK (discount_value > 0),
    minimum_order_amount INT         NOT NULL DEFAULT 0,
    usage_limit          INT,
    times_used           INT         DEFAULT 0,
    starts_at            TIMESTAMP,
    expires_at           TIMESTAMP,
    is_active            BOOLEAN     DEFAULT TRUE,
    created_at           TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE promotions (
    promotion_id   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    title          VARCHAR(255) NOT NULL,
    description    TEXT,
    discount_type  VARCHAR(20)  CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value INT          NOT NULL,
    starts_at      TIMESTAMP,
    expires_at     TIMESTAMP,
    is_active      BOOLEAN      DEFAULT TRUE,
    created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin (
    admin_id      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name     VARCHAR(255) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT         NOT NULL,
    is_active     BOOLEAN      DEFAULT TRUE,
    last_login    TIMESTAMP,
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
    permission_id   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_name VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);


-- ==========================================
-- LEVEL 2: First-Tier Dependencies
-- ==========================================

CREATE TABLE admin_permissions (
    admin_id      UUID      NOT NULL REFERENCES admin(admin_id)            ON DELETE CASCADE,
    permission_id UUID      NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
    granted_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (admin_id, permission_id)
);

CREATE TABLE addresses (
    address_id   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id  UUID         NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
    region       VARCHAR(20)  NOT NULL,
    city         VARCHAR(20)  NOT NULL,
    address_line VARCHAR(255) NOT NULL,
    created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE carts (
    cart_id     UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID      NOT NULL UNIQUE REFERENCES customer(customer_id) ON DELETE CASCADE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product (
    prod_id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id        UUID          REFERENCES vendor(vendor_id)     ON DELETE SET NULL,
    cat_id           UUID          REFERENCES categories(cat_id)    ON DELETE SET NULL,
    prod_name        VARCHAR(100)  NOT NULL,
    price            NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    prod_description TEXT
);


-- ==========================================
-- LEVEL 3: Second-Tier Dependencies
-- ==========================================

CREATE TABLE product_images (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prod_id   UUID NOT NULL REFERENCES product(prod_id) ON DELETE CASCADE,
    image_url TEXT NOT NULL
);

CREATE TABLE product_variants (
    prod_var_id    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    prod_id        UUID          NOT NULL REFERENCES product(prod_id) ON DELETE CASCADE,
    prod_size      VARCHAR(20),
    prod_color     VARCHAR(30),
    prod_price     NUMERIC(12,2) CHECK (prod_price > 0),
    stock_quantity INT           NOT NULL CHECK (stock_quantity >= 0),
    created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reviews (
    review_id   UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID      REFERENCES customer(customer_id) ON DELETE SET NULL,
    product_id  UUID      NOT NULL REFERENCES product(prod_id) ON DELETE CASCADE,
    comment     TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (customer_id, product_id)
);

CREATE TABLE orders (
    order_id       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id    UUID          NOT NULL REFERENCES customer(customer_id) ON DELETE RESTRICT,
    address_id     UUID          REFERENCES addresses(address_id)          ON DELETE RESTRICT,
    order_number   VARCHAR(50)   NOT NULL UNIQUE,
    total_amount   NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
    payment_method VARCHAR(50),
    payment_status VARCHAR(20)   DEFAULT 'pending',
    order_status   VARCHAR(20)   DEFAULT 'pending',
    order_notes    TEXT,
    placed_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);


-- ==========================================
-- LEVEL 4: Junction & Transactional Tables
-- ==========================================

CREATE TABLE cart_items (
    id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id     UUID      NOT NULL REFERENCES carts(cart_id)                ON DELETE CASCADE,
    prod_var_id UUID      NOT NULL REFERENCES product_variants(prod_var_id) ON DELETE CASCADE,
    quantity    INT       NOT NULL CHECK (quantity > 0),
    added_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (cart_id, prod_var_id)
);

CREATE TABLE inventory (
    id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    prod_var_id UUID      NOT NULL REFERENCES product_variants(prod_var_id) ON DELETE CASCADE,
    stock_in    INT       DEFAULT 0 CHECK (stock_in >= 0),
    stock_out   INT       DEFAULT 0 CHECK (stock_out >= 0),
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    items_id    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID          NOT NULL REFERENCES orders(order_id)               ON DELETE CASCADE,
    prod_var_id UUID          NOT NULL REFERENCES product_variants(prod_var_id)  ON DELETE RESTRICT,
    quantity    INT           NOT NULL CHECK (quantity > 0),
    unit_price  NUMERIC(12,2) NOT NULL CHECK (unit_price > 0)
);

CREATE TABLE coupon_usages (
    coupon_usage_id UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id       UUID      REFERENCES coupons(coupon_id)    ON DELETE SET NULL,
    customer_id     UUID      REFERENCES customer(customer_id) ON DELETE SET NULL,
    order_id        UUID      REFERENCES orders(order_id)      ON DELETE CASCADE,
    used_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payment (
    payment_id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id              UUID         NOT NULL REFERENCES orders(order_id)      ON DELETE CASCADE,
    customer_id           UUID         NOT NULL REFERENCES customer(customer_id) ON DELETE RESTRICT,
    payment_method        VARCHAR(20)  NOT NULL CHECK (payment_method IN ('MTN_MOMO', 'ORANGE_MONEY')),
    transaction_reference VARCHAR(100) UNIQUE,
    phone_number          VARCHAR(9)   NOT NULL,
    amount                INT          NOT NULL CHECK (amount > 0),
    currency              VARCHAR(5)   DEFAULT 'XAF',
    payment_status        VARCHAR(20)  DEFAULT 'pending' CHECK (payment_status IN ('pending', 'successful', 'failed')),
    created_at            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE category_promotions (
    category_id  UUID REFERENCES categories(cat_id)       ON DELETE CASCADE,
    promotion_id UUID REFERENCES promotions(promotion_id) ON DELETE CASCADE,
    PRIMARY KEY (category_id, promotion_id)
);

CREATE TABLE product_promotions (
    product_id   UUID REFERENCES product(prod_id)         ON DELETE CASCADE,
    promotion_id UUID REFERENCES promotions(promotion_id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, promotion_id)
);


-- ==========================================
-- INDEXES
-- ==========================================

CREATE INDEX idx_admin_permissions_admin      ON admin_permissions(admin_id);
CREATE INDEX idx_admin_permissions_permission ON admin_permissions(permission_id);
CREATE INDEX idx_addresses_customer           ON addresses(customer_id);
CREATE INDEX idx_product_vendor               ON product(vendor_id);
CREATE INDEX idx_product_category             ON product(cat_id);
CREATE INDEX idx_product_variants_prod        ON product_variants(prod_id);
CREATE INDEX idx_product_images_prod          ON product_images(prod_id);
CREATE INDEX idx_reviews_customer             ON reviews(customer_id);
CREATE INDEX idx_reviews_product              ON reviews(product_id);
CREATE INDEX idx_orders_customer              ON orders(customer_id);
CREATE INDEX idx_orders_address               ON orders(address_id);
CREATE INDEX idx_cart_items_cart              ON cart_items(cart_id);
CREATE INDEX idx_cart_items_variant           ON cart_items(prod_var_id);
CREATE INDEX idx_inventory_variant            ON inventory(prod_var_id);
CREATE INDEX idx_order_items_order            ON order_items(order_id);
CREATE INDEX idx_order_items_variant          ON order_items(prod_var_id);
CREATE INDEX idx_coupon_usages_order          ON coupon_usages(order_id);
CREATE INDEX idx_coupon_usages_coupon         ON coupon_usages(coupon_id);
CREATE INDEX idx_payment_order                ON payment(order_id);
CREATE INDEX idx_payment_customer             ON payment(customer_id);


-- ==========================================
-- SEED: PERMISSIONS
-- ==========================================

INSERT INTO permissions (permission_name, description) VALUES
    ('manage_users',         'Create, edit, suspend, and delete customer accounts'),
    ('manage_admins',        'Grant and revoke permissions for other administrators'),
    ('manage_vendors',       'Register, verify, and manage vendor accounts'),
    ('manage_products',      'Add, edit, and remove product listings'),
    ('manage_categories',    'Create and manage product categories'),
    ('manage_orders',        'View, update, and process customer orders'),
    ('manage_payments',      'Monitor and verify payment transactions'),
    ('manage_refunds',       'Approve and reject refund requests'),
    ('manage_inventory',     'Update stock quantities'),
    ('manage_delivery',      'Track shipments and update delivery status'),
    ('manage_promotions',    'Create and manage promotional campaigns'),
    ('manage_discounts',     'Create and manage coupon codes'),
    ('manage_reviews',       'Moderate and remove customer product reviews'),
    ('manage_support',       'Respond to and resolve customer support tickets'),
    ('manage_notifications', 'Send system notifications and announcements'),
    ('manage_settings',      'Modify platform configuration and system settings'),
    ('view_reports',         'Access analytics, sales, and performance reports');
	
