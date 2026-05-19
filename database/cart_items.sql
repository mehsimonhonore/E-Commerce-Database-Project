CREATE TABLE cart_items (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	cart_id UUID NOT NULL REFERENCES carts(cart_id),
	prod_var_id UUID NOT NULL REFERENCES product_variants(prod_var_id),
	quantity INT NOT NULL CHECK ( quantity > 0),
	added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);