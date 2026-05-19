CREATE TABLE carts(
	cart_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	customer_id UUID NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);