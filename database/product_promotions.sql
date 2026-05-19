CREATE TABLE product_promotions (
	product_id UUID REFERENCES product(prod_id) ON DELETE CASCADE,
	promotion_id UUID REFERENCES promotions(promotion_id) ON DELETE CASCADE,
	PRIMARY KEY (product_id, promotion_id)
);