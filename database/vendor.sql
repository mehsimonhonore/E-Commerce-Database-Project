CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE vendor (
	vendor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	brand_name VARCHAR(255) NOT NULL,
	vendor_name VARCHAR(255) NOT NULL,
	vendor_email VARCHAR(255) UNIQUE NOT NULL,
	telephone_num VARCHAR(13) UNIQUE NOT NULL,
	business_address TEXT NOT NULL,
	is_verified BOOLEAN DEFAULT FALSE,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
); 