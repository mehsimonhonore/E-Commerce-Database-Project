CREATE TABLE reviews (
	review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	customer_id UUID REFERENCES customer(customer_id) ON DELETE CASCADE,
	product_id UUID NOT NULL REFERENCES product(prod_id) ON DELETE CASCADE,
	comment TEXT,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	UNIQUE(customer_id, product_id)
);