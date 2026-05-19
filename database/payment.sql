CREATE TABLE payment (
	payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
	customer_id UUID NOT NULL REFERENCES customer(customer_id),
	payment_method VARCHAR(20) NOT NULL CHECK(
		payment_method IN ('MTN_MOMO', 'ORANGE_MONEY')
	  ),
	transaction_reference varchar(100) UNIQUE,
	phone_number VARCHAR(9) NOT NULL,
	amount INT NOT NULL CHECK( amount >0 ),
	currency VARCHAR(5) DEFAULT 'XAF',
	payment_status VARCHAR(20) DEFAULT 'pending' CHECK
		( payment_status IN ('pending', 'succesful', 'failed') ),
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);