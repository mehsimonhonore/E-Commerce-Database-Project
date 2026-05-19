CREATE TABLE admin_role(
	admin_roleid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	role_name VARCHAR(50) UNIQUE NOT NULL,
	description TEXT
);