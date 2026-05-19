CREATE TABLE product_images (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	prod_id UUID NOT NULL REFERENCES product(prod_id) ON DELETE CASCADE,
	image_url TEXT NOT NULL
);