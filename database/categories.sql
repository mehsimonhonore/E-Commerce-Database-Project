CREATE TABLE categories (
	cat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	cat_name VARCHAR(100) UNIQUE NOT NULL
);