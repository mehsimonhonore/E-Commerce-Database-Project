CREATE TABLE coupons (
	coupon_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	code VARCHAR(50) UNIQUE NOT NULL,
	description TEXT,
	discount_type VARCHAR(20) NOT NULL CHECK ( 
	discount_type IN ('percentage', 'fixed') ),
	discount_value INT NOT NULL CHECK( discount_value > 0 ),
	minimum_order_amount INT NOT NULL DEFAULT 0,
	usage_limit INT,
	times_used INT DEFAULT 0,
	starts_at TIMESTAMP,
	expires_at TIMESTAMP,
	is_active BOOLEAN,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);