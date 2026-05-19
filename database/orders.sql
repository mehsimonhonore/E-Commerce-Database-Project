CREATE TABLE orders(
	order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	customer_id UUID NOT NULL REFERENCES customer(customer_id),
	address_id UUID REFERENCES addresses(address_id),
	order_number VARCHAR(50) UNIQUE NOT NULL,
	total_amount NUMERIC NOT NULL CHECK(total_amount >= 0),
	payment_method VARCHAR(50),
	payment_status VARCHAR(20) DEFAULT 'pending',
	order_status VARCHAR(20) DEFAULT 'pending',
	order_notes TEXT,
	placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);