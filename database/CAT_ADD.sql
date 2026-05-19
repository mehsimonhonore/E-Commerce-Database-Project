ALTER TABLE product
ADD cat_id UUID REFERENCES categories(cat_id),
ADD category VARCHAR(50)	
 