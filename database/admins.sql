CREATE TABLE admins (
	admin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	role_id UUID REFERENCES admin_role(admin_roleid),
	full_name VARCHAR(255) NOT NULL,
	email VARCHAR(255) UNIQUE NOT NULL,
	password_hash TEXT NOT NULL,
	is_active BOOLEAN DEFAULT TRUE,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);