CREATE TABLE inventory (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	prod_var_id UUID NOT NULL REFERENCES product_variantS(prod_var_id),
	stock_in INT DEFAULT 0,
	stock_out INT DEFAULT 0,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);