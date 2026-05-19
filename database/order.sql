CREATE TABLE addresses(
	address_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	customer_id UUID NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
	region VARCHAR(20) NOT NULL,
	city VARCHAR(20) NOT NULL,
	address_line VARCHAR(255) NOT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);