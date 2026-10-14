-- Migration 001: dispatch_rulebook & express_orders
CREATE TABLE IF NOT EXISTS public.dispatch_rulebook (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_code VARCHAR(50) UNIQUE NOT NULL,
    track VARCHAR(20) NOT NULL,
    cargo_type VARCHAR(50) NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL,
    base_price_min NUMERIC(10,2) NOT NULL,
    base_price_max NUMERIC(10,2) NOT NULL,
    fee_credit_percent NUMERIC(4,2) DEFAULT 0.05,
    fee_cash_percent NUMERIC(4,2) DEFAULT 0.08,
    pii_restriction_level VARCHAR(20) DEFAULT 'strict_mask',
    delivery_flow JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.dispatch_rulebook (
    scenario_code, track, cargo_type, vehicle_type,
    base_price_min, base_price_max, fee_credit_percent, fee_cash_percent,
    delivery_flow
) VALUES (
    'EXP_ENVELOPE_COURT',
    'express',
    'envelope',
    'scooter',
    80.00,
    150.00,
    0.05,
    0.08,
    '{
       "requires_hand_delivery": true,
       "requires_signature": true,
       "allowed_payment_methods": ["cash_cod", "credit_card", "net_30"],
       "suggested_fee_cash": 8.80,
       "suggested_courier_net": 110.00
    }'::jsonb
) ON CONFLICT (scenario_code) DO UPDATE 
SET base_price_min = EXCLUDED.base_price_min,
    base_price_max = EXCLUDED.base_price_max;

CREATE TABLE IF NOT EXISTS public.express_orders (
    order_id VARCHAR(50) PRIMARY KEY,
    client_name VARCHAR(100) NOT NULL,
    origin_city VARCHAR(100) NOT NULL,
    dest_city VARCHAR(100) NOT NULL,
    origin_address_masked TEXT,
    dest_address_masked TEXT,
    recipient_name VARCHAR(100),
    recipient_phone_encrypted TEXT,
    cargo_description TEXT,
    vehicle_required VARCHAR(50),
    payment_method VARCHAR(20),
    total_amount NUMERIC(10,2),
    courier_payout NUMERIC(10,2),
    system_fee NUMERIC(10,2),
    fee_rate NUMERIC(4,2),
    status VARCHAR(30) DEFAULT 'ready_for_dispatch',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.express_orders (
    order_id, client_name, origin_city, dest_city,
    origin_address_masked, dest_address_masked,
    recipient_name, recipient_phone_encrypted,
    cargo_description, vehicle_required, payment_method,
    total_amount, courier_payout, system_fee, fee_rate, status
) VALUES (
    'EXP-2026-891',
    'ראמי מסארוה',
    'הוד השרון',
    'תל אביב',
    'התלמיד 6, הוד השרון',
    'בית המשפט המחוזי, ויצמן 1, תל אביב',
    'עו"ד עזאם נאשף',
    '050-8860896',
    'מעטפה / מסמכים משפטיים דחופים (מסירה אישית וחתימה)',
    'קטנוע / אופנוע שליחויות',
    'cash_cod',
    110.00,
    110.00,
    8.80,
    0.08,
    'ready_for_dispatch'
) ON CONFLICT (order_id) DO NOTHING;
