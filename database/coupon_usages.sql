CREATE TABLE coupon_usages (
	coupon_usage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	coupon_id UUID REFERENCES coupons(coupon_id),
	customer_id UUID REFERENCES customer(customer_id),
	order_id UUID REFERENCES orders(order_id),
	used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);