CREATE TABLE order_items (
 items_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
	prod_id UUID NOT NULL REFERENCES product(prod_id),
	quantity INT NOT NULL CHECK (quantity > 0),
	unit_price NUMERIC NOT NULL CHECK (unit_price > 0),
	subtotal NUMERIC NOT NULL CHECK (subtotal > 0)
);