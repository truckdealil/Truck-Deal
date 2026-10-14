-- ======================================================================
-- טראק דיל il (Truk Deal IL) — Database Schema & Dispatch Rulebook
-- Migration: 001_dispatch_and_express.sql
-- ======================================================================

-- 1. טבלת ספר חוקים ותבניות שיחה לשליפה חוזרת
CREATE TABLE IF NOT EXISTS public.dispatch_rulebook (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_code VARCHAR(50) UNIQUE NOT NULL,      -- לדוגמה: EXP_ENVELOPE_COURT
    track VARCHAR(20) NOT NULL,                    -- express / heavy / crane
    cargo_type VARCHAR(50) NOT NULL,                -- envelope, box, furniture, pallet
    vehicle_type VARCHAR(50) NOT NULL,              -- scooter, car, van_3_5t, truck_12t, crane
    base_price_min NUMERIC(10,2) NOT NULL,
    base_price_max NUMERIC(10,2) NOT NULL,
    fee_credit_percent NUMERIC(4,2) DEFAULT 0.05,
    fee_cash_percent NUMERIC(4,2) DEFAULT 0.08,
    pii_restriction_level VARCHAR(20) DEFAULT 'strict_mask',
    delivery_flow JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- אינדקס לשליפה מהירה לפי scenario_code ו-track
CREATE INDEX IF NOT EXISTS idx_dispatch_rulebook_scenario ON public.dispatch_rulebook(scenario_code);
CREATE INDEX IF NOT EXISTS idx_dispatch_rulebook_track ON public.dispatch_rulebook(track);

-- הזרקת חוק תסריט א' (מעטפה משפטית / שליחות קטנוע מזומן 8%)
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
    base_price_max = EXCLUDED.base_price_max,
    delivery_flow = EXCLUDED.delivery_flow;

-- הזרקת חוקי בסיס נוספים למערכת (חבילות, טנדר ומנוף)
INSERT INTO public.dispatch_rulebook (
    scenario_code, track, cargo_type, vehicle_type,
    base_price_min, base_price_max, fee_credit_percent, fee_cash_percent,
    delivery_flow
) VALUES 
(
    'EXP_PARCEL_STANDARD',
    'express',
    'box',
    'car',
    80.00,
    150.00,
    0.05,
    0.08,
    '{
       "max_boxes": 3,
       "requires_hand_delivery": false,
       "allowed_payment_methods": ["cash_cod", "credit_card", "net_30"]
    }'::jsonb
),
(
    'EXP_VAN_OFFICE',
    'express',
    'office_boxes',
    'van_3_5t',
    140.00,
    280.00,
    0.05,
    0.08,
    '{
       "max_boxes": 10,
       "requires_loading_help": true,
       "allowed_payment_methods": ["credit_card", "cash_cod", "net_30"]
    }'::jsonb
),
(
    'HVY_APT_TRUCK_12T',
    'heavy',
    'furniture',
    'truck_12t',
    1800.00,
    3600.00,
    0.15,
    0.15,
    '{
       "includes_hydraulic_lift": true,
       "typical_rooms": "3-5",
       "allowed_payment_methods": ["credit_card", "bank_transfer", "cash_deposit"]
    }'::jsonb
),
(
    'CRANE_LADDER_HOIST',
    'crane',
    'heavy_hoist',
    'crane',
    350.00,
    450.00,
    0.15,
    0.15,
    '{
       "max_floor": 18,
       "hourly_rate": 400.00,
       "allowed_payment_methods": ["credit_card", "bank_transfer"]
    }'::jsonb
) ON CONFLICT (scenario_code) DO NOTHING;

-- 2. טבלת תיעוד הזמנות אקספרס וסנכרון סשן
CREATE TABLE IF NOT EXISTS public.express_orders (
    order_id VARCHAR(50) PRIMARY KEY,              -- EXP-2026-891
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

-- אינדקס לשליפה מהירה לפי סטטוס ועיר
CREATE INDEX IF NOT EXISTS idx_express_orders_status ON public.express_orders(status);
CREATE INDEX IF NOT EXISTS idx_express_orders_cities ON public.express_orders(origin_city, dest_city);

-- רישום ההזמנה של ראמי מסארוה שנסגרה בתסריט
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
