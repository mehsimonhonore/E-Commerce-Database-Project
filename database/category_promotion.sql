CREATE TABLE category_promotions(
	category_id UUID REFERENCES categories(cat_id),
	promotion_id UUID REFERENCES promotions(promotion_id),
	PRIMARY KEY(category_id, promotion_id)
);