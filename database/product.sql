
CREATE TABLE product(
	prod_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	prod_name VARCHAR(30),
	price NUMERIC NOT NULL,
	prod_description TEXT
);