CREATE TABLE promotions (
	promotion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	title VARCHAR(255) NOT NULL,
	description TEXT,
	discount_type VARCHAR(20) CHECK ( discount_type IN('percentage', 'fixed') ),
	discount_value INT NOT NULL,
	starts_at TIMESTAMP,
	expires_at TIMESTAMP,
	is_active BOOLEAN,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);