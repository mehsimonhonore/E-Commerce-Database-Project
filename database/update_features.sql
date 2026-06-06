-- Database update for Trendora enhancements

-- Add balance field to vendor table
ALTER TABLE vendor ADD COLUMN IF NOT EXISTS balance NUMERIC(12,2) DEFAULT 0.00 CHECK (balance >= 0);

-- Customer support tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
    ticket_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customer(customer_id) ON DELETE SET NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'closed')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Support ticket messages table
CREATE TABLE IF NOT EXISTS ticket_responses (
    response_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,
    sender VARCHAR(10) CHECK (sender IN ('customer', 'admin')),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- User notifications table
CREATE TABLE IF NOT EXISTS notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Order refund requests table
CREATE TABLE IF NOT EXISTS refunds (
    refund_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    amount NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Order item returns table
CREATE TABLE IF NOT EXISTS returns (
    return_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    condition VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Vendor payout tracking table
CREATE TABLE IF NOT EXISTS vendor_payouts (
    payout_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendor(vendor_id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'paid' CHECK (status IN ('pending', 'paid', 'failed')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security (RLS) on new tables
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;

-- Set up RLS policies for own customer data access
DROP POLICY IF EXISTS support_tickets_self_policy ON support_tickets;
CREATE POLICY support_tickets_self_policy ON support_tickets
    FOR ALL USING (customer_id = NULLIF(current_setting('app.current_customer_id', true), '')::uuid);

DROP POLICY IF EXISTS ticket_responses_self_policy ON ticket_responses;
CREATE POLICY ticket_responses_self_policy ON ticket_responses
    FOR ALL USING (ticket_id IN (SELECT ticket_id FROM support_tickets));

DROP POLICY IF EXISTS notifications_self_policy ON notifications;
CREATE POLICY notifications_self_policy ON notifications
    FOR ALL USING (customer_id = NULLIF(current_setting('app.current_customer_id', true), '')::uuid);

DROP POLICY IF EXISTS refunds_self_policy ON refunds;
CREATE POLICY refunds_self_policy ON refunds
    FOR ALL USING (customer_id = NULLIF(current_setting('app.current_customer_id', true), '')::uuid);

DROP POLICY IF EXISTS returns_self_policy ON returns;
CREATE POLICY returns_self_policy ON returns
    FOR ALL USING (customer_id = NULLIF(current_setting('app.current_customer_id', true), '')::uuid);
