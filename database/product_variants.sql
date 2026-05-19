CREATE TABLE product_variants (
	prod_var_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	prod_id UUID NOT NULL REFERENCES product(prod_id) ON DELETE CASCADE,
	prod_size VARCHAR(20),  --xl, 42
	prod_color varchar(30),
	prod_price NUMERIC CHECK ( prod_price > 0 ),
	stock_quantity INT NOT NULL CHECK (stock_quantity >= 0),
	ctreated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);