-- Demo data for the Trendora fashion e-commerce platform.

-- Seed fashion categories
INSERT INTO categories (cat_id, cat_name) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Shoes'),
    ('22222222-2222-2222-2222-222222222222', 'Men''s Clothing'),
    ('33333333-3333-3333-3333-333333333333', 'Women''s Clothing'),
    ('44444444-4444-4444-4444-444444444444', 'Watches & Accessories')
ON CONFLICT (cat_id) DO UPDATE SET cat_name = EXCLUDED.cat_name;

-- Seed vendors (matching existing database UUIDs to prevent unique constraint violations)
INSERT INTO vendor (
    vendor_id,
    brand_name,
    vendor_name,
    vendor_email,
    telephone_num,
    business_address,
    is_verified
) VALUES
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'Molyko Couture',
        'Molyko Couture Ltd',
        'sales@molyko-couture.example',
        '+237650000001',
        'Molyko, Buea, Cameroon',
        TRUE
    ),
    (
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'Akwa Styles',
        'Akwa Styles Ltd',
        'sales@akwa-styles.example',
        '+237650000002',
        'Akwa, Douala, Cameroon',
        TRUE
    )
ON CONFLICT (vendor_id) DO UPDATE SET
    brand_name = EXCLUDED.brand_name,
    vendor_name = EXCLUDED.vendor_name,
    vendor_email = EXCLUDED.vendor_email,
    telephone_num = EXCLUDED.telephone_num,
    business_address = EXCLUDED.business_address,
    is_verified = TRUE;

-- Seed demo customer
INSERT INTO customer (
    customer_id,
    first_name,
    last_name,
    email,
    phone_num,
    password_hash
) VALUES (
    '99999999-9999-9999-9999-999999999999',
    'Demo',
    'Customer',
    'demo@trendora.test',
    '+237650000099',
    '$2a$10$QaOSZX5sPN5GdnOKRXYSOeBf3LDPVZjBT1nWNHtlDhfZb7lM.viQq'
)
ON CONFLICT (customer_id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    phone_num = EXCLUDED.phone_num,
    password_hash = EXCLUDED.password_hash;

-- Ensure demo cart exists
INSERT INTO carts (cart_id, customer_id) VALUES
    ('88888888-8888-8888-8888-888888888888', '99999999-9999-9999-9999-999999999999')
ON CONFLICT (customer_id) DO NOTHING;

-- Seed promotional coupons
INSERT INTO coupons (
    coupon_id,
    code,
    description,
    discount_type,
    discount_value,
    minimum_order_amount,
    usage_limit,
    starts_at,
    expires_at,
    is_active
) VALUES
    (
        '77777777-7777-7777-7777-777777777701',
        'MOMO10',
        '10 percent off mobile money checkout',
        'percentage',
        10,
        5000,
        500,
        NOW() - INTERVAL '1 day',
        NOW() + INTERVAL '90 days',
        TRUE
    ),
    (
        '77777777-7777-7777-7777-777777777702',
        'FASHION2000',
        '2,000 FCFA off orders above 15,000 FCFA',
        'fixed',
        2000,
        15000,
        500,
        NOW() - INTERVAL '1 day',
        NOW() + INTERVAL '90 days',
        TRUE
    )
ON CONFLICT (coupon_id) DO UPDATE SET
    code = EXCLUDED.code,
    description = EXCLUDED.description,
    discount_type = EXCLUDED.discount_type,
    discount_value = EXCLUDED.discount_value,
    minimum_order_amount = EXCLUDED.minimum_order_amount,
    usage_limit = EXCLUDED.usage_limit,
    starts_at = EXCLUDED.starts_at,
    expires_at = EXCLUDED.expires_at,
    is_active = TRUE;

-- Seed fashion products
INSERT INTO product (
    prod_id,
    vendor_id,
    cat_id,
    prod_name,
    price,
    prod_description
) VALUES
    (
        '10000000-0000-0000-0000-000000000001',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        '11111111-1111-1111-1111-111111111111',
        'Classic White Sneakers',
        28500,
        'Clean everyday sneakers with a durable sole for city wear. Accented with trendy orange details.'
    ),
    (
        '10000000-0000-0000-0000-000000000002',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '22222222-2222-2222-2222-222222222222',
        'Streetwear Purple Hoodie',
        25000,
        'Cozy cotton hoodie in deep purple featuring stylish orange drawstrings.'
    ),
    (
        '10000000-0000-0000-0000-000000000003',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '33333333-3333-3333-3333-333333333333',
        'Elegant Summer Dress',
        45000,
        'Beautiful, light summer dress featuring vibrant orange and white patterns.'
    ),
    (
        '10000000-0000-0000-0000-000000000004',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        '44444444-4444-4444-4444-444444444444',
        'Luxury Gold Watch',
        75000,
        'Stunning quartz watch with a gold dial and a premium purple leather band.'
    ),
    (
        '10000000-0000-0000-0000-000000000005',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        '22222222-2222-2222-2222-222222222222',
        'Vintage Leather Jacket',
        60000,
        'Premium brown vintage leather jacket designed for timeless fashion looks.'
    ),
    (
        '10000000-0000-0000-0000-000000000006',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '33333333-3333-3333-3333-333333333333',
        'Classic Denim Jeans',
        20000,
        'High-waisted comfort-fit denim jeans in vintage indigo blue.'
    )
ON CONFLICT (prod_id) DO UPDATE SET
    prod_name = EXCLUDED.prod_name,
    price = EXCLUDED.price,
    prod_description = EXCLUDED.prod_description,
    vendor_id = EXCLUDED.vendor_id,
    cat_id = EXCLUDED.cat_id;

-- Seed product variants
INSERT INTO product_variants (
    prod_var_id,
    prod_id,
    prod_size,
    prod_color,
    prod_price,
    stock_quantity
) VALUES
    (
        '20000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001',
        'EU 43',
        'White/Orange',
        28500,
        30
    ),
    (
        '20000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000001',
        'EU 42',
        'White/Orange',
        28500,
        15
    ),
    (
        '20000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000002',
        'L',
        'Purple',
        25000,
        40
    ),
    (
        '20000000-0000-0000-0000-000000000004',
        '10000000-0000-0000-0000-000000000002',
        'M',
        'Purple',
        25000,
        25
    ),
    (
        '20000000-0000-0000-0000-000000000005',
        '10000000-0000-0000-0000-000000000003',
        'M',
        'White/Orange',
        45000,
        20
    ),
    (
        '20000000-0000-0000-0000-000000000006',
        '10000000-0000-0000-0000-000000000004',
        'Standard',
        'Gold',
        75000,
        10
    ),
    (
        '20000000-0000-0000-0000-000000000007',
        '10000000-0000-0000-0000-000000000005',
        'L',
        'Brown',
        60000,
        15
    ),
    (
        '20000000-0000-0000-0000-000000000008',
        '10000000-0000-0000-0000-000000000006',
        '30',
        'Blue',
        20000,
        25
    )
ON CONFLICT (prod_var_id) DO UPDATE SET
    prod_size = EXCLUDED.prod_size,
    prod_color = EXCLUDED.prod_color,
    prod_price = EXCLUDED.prod_price,
    stock_quantity = EXCLUDED.stock_quantity;

-- Seed product images pointing to generated files
INSERT INTO product_images (prod_id, image_url)
SELECT data.prod_id::uuid, data.image_url
FROM (VALUES
    ('10000000-0000-0000-0000-000000000001', '../src/shoe.png'),
    ('10000000-0000-0000-0000-000000000002', '../src/hoodie.png'),
    ('10000000-0000-0000-0000-000000000003', '../src/dress.png'),
    ('10000000-0000-0000-0000-000000000004', '../src/watch.png'),
    ('10000000-0000-0000-0000-000000000005', '../src/jacket.png'),
    ('10000000-0000-0000-0000-000000000006', '../src/jeans.png')
) AS data(prod_id, image_url)
WHERE NOT EXISTS (
    SELECT 1
    FROM product_images pi
    WHERE pi.prod_id = data.prod_id::uuid
      AND pi.image_url = data.image_url
);
