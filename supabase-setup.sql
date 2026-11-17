-- ====================================================================
-- FITORA GYM MEMBERSHIP MANAGEMENT PLATFORM - SUPABASE SCHEMA SETUP
-- Database: PostgreSQL 14+ (Supabase)
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop Existing Tables (if executing fresh reset)
DROP TABLE IF EXISTS notification_logs CASCADE;
DROP TABLE IF EXISTS renewal_requests CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS memberships CASCADE;
DROP TABLE IF EXISTS membership_plans CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 3. PROFILES TABLE (Stores user info and roles)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
    membership_id TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MEMBERSHIP PLANS TABLE
CREATE TABLE membership_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_name TEXT NOT NULL,
    description TEXT,
    duration_days INTEGER NOT NULL CHECK (duration_days > 0),
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. MEMBERSHIPS TABLE (Tracks member subscriptions and real-time status)
CREATE TABLE memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES membership_plans(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'payment_pending' 
        CHECK (status IN ('active', 'expiring_soon', 'payment_pending', 'expired', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PAYMENTS TABLE (Manual and gateway-ready payment records)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    membership_id UUID REFERENCES memberships(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'upi', 'card', 'bank_transfer')),
    transaction_reference TEXT,
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('confirmed', 'pending', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ATTENDANCE TABLE (Daily gym check-ins and check-outs)
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    check_in TIMESTAMPTZ DEFAULT NOW(),
    check_out TIMESTAMPTZ,
    attendance_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_daily_member_checkin UNIQUE (member_id, attendance_date)
);

-- 8. NOTIFICATIONS TABLE (In-app and simulated email notifications)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT NOT NULL DEFAULT 'system' 
        CHECK (notification_type IN ('expiry', 'activation', 'payment', 'renewal', 'system', 'announcement')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. RENEWAL REQUESTS TABLE (Member requests for renewals pending admin review)
CREATE TABLE renewal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    membership_id UUID REFERENCES memberships(id) ON DELETE SET NULL,
    requested_plan_id UUID NOT NULL REFERENCES membership_plans(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. NOTIFICATION LOGS TABLE (Deduplication engine for automated expiry alerts)
CREATE TABLE notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('7_days', '3_days', '1_day', 'on_expiry', 'post_expiry')),
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_membership_reminder UNIQUE (membership_id, reminder_type)
);

-- ====================================================================
-- INDEXES FOR MAXIMUM QUERY EFFICIENCY
-- ====================================================================
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_membership_id ON profiles(membership_id);
CREATE INDEX idx_memberships_member_id ON memberships(member_id);
CREATE INDEX idx_memberships_status ON memberships(status);
CREATE INDEX idx_memberships_expiry_date ON memberships(expiry_date);
CREATE INDEX idx_payments_member_id ON payments(member_id);
CREATE INDEX idx_payments_status ON payments(payment_status);
CREATE INDEX idx_attendance_member_date ON attendance(member_id, attendance_date);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);

-- ====================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER ON AUTH SIGNUP
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_fitora_user()
RETURNS TRIGGER AS $$
DECLARE
    new_mem_id TEXT;
    user_full_name TEXT;
    user_phone TEXT;
BEGIN
    -- Extract full name from raw user meta data or default
    user_full_name := COALESCE(new.raw_user_meta_data->>'full_name', 'FITORA Athlete');
    user_phone := new.raw_user_meta_data->>'phone';
    
    -- Generate unique Membership ID: FIT-YYYY-XXXX
    new_mem_id := 'FIT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');

    INSERT INTO public.profiles (id, full_name, email, phone, role, membership_id)
    VALUES (
        new.id,
        user_full_name,
        new.email,
        user_phone,
        'member', -- Always default to member; admins are assigned manually via SQL or master console
        new_mem_id
    );

    -- Welcome notification
    INSERT INTO public.notifications (user_id, title, message, notification_type)
    VALUES (
        new.id,
        'Welcome to FITORA!',
        'Your athlete profile has been created with Member ID: ' || new_mem_id || '. Subscribe to a plan to start your workout journey.',
        'activation'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind Trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_fitora_user();

-- ====================================================================
-- AUTOMATED MEMBERSHIP EXPIRY & NOTIFICATION ENGINE
-- ====================================================================
CREATE OR REPLACE FUNCTION public.fitora_check_and_notify_expiries()
RETURNS json AS $$
DECLARE
    m RECORD;
    days_left INT;
    processed_count INT := 0;
    reminder_tag TEXT;
    notif_msg TEXT;
BEGIN
    FOR m IN 
        SELECT 
            mem.id AS membership_id, 
            mem.member_id, 
            mem.expiry_date, 
            mem.status,
            p.plan_name,
            prof.full_name,
            prof.email,
            (mem.expiry_date - CURRENT_DATE) AS remaining_days
        FROM memberships mem
        JOIN membership_plans p ON mem.plan_id = p.id
        JOIN profiles prof ON mem.member_id = prof.id
        WHERE mem.status IN ('active', 'expiring_soon')
    LOOP
        days_left := m.remaining_days;
        reminder_tag := NULL;

        -- Expiry status transitions
        IF days_left <= 0 THEN
            UPDATE memberships SET status = 'expired' WHERE id = m.membership_id;
            reminder_tag := 'on_expiry';
            notif_msg := 'Your FITORA ' || m.plan_name || ' membership has expired. Please renew your subscription to continue gym access.';
        ELSIF days_left = 1 THEN
            UPDATE memberships SET status = 'expiring_soon' WHERE id = m.membership_id;
            reminder_tag := '1_day';
            notif_msg := 'URGENT: Your FITORA membership expires tomorrow. Renew now to avoid interruption.';
        ELSIF days_left <= 3 THEN
            UPDATE memberships SET status = 'expiring_soon' WHERE id = m.membership_id;
            reminder_tag := '3_days';
            notif_msg := 'Your FITORA membership expires in ' || days_left || ' days. Renew your membership to continue enjoying your fitness journey.';
        ELSIF days_left <= 7 THEN
            reminder_tag := '7_days';
            notif_msg := 'Reminder: Your FITORA ' || m.plan_name || ' membership expires in ' || days_left || ' days.';
        END IF;

        -- If reminder is needed and has NOT been sent yet
        IF reminder_tag IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM notification_logs 
                WHERE membership_id = m.membership_id AND reminder_type = reminder_tag
            ) THEN
                -- 1. Insert Member In-App Notification
                INSERT INTO notifications (user_id, title, message, notification_type)
                VALUES (m.member_id, 'Membership Expiry Notice', notif_msg, 'expiry');

                -- 2. Log Notification to prevent duplicates
                INSERT INTO notification_logs (membership_id, reminder_type)
                VALUES (m.membership_id, reminder_tag);

                -- 3. Notify Admins
                INSERT INTO notifications (user_id, title, message, notification_type)
                SELECT 
                    id, 
                    'Member Expiry Alert: ' || m.full_name,
                    'Member ' || m.full_name || ' (' || m.email || ') membership expires in ' || days_left || ' day(s).',
                    'expiry'
                FROM profiles 
                WHERE role = 'admin';

                processed_count := processed_count + 1;
            END IF;
        END IF;
    END LOOP;

    RETURN json_build_object(
        'status', 'success',
        'processed_alerts', processed_count,
        'checked_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE renewal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is an Admin
CREATE OR REPLACE FUNCTION public.is_fitora_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. PROFILES POLICIES
CREATE POLICY "Users can view own profile" 
    ON profiles FOR SELECT USING (auth.uid() = id OR is_fitora_admin());

CREATE POLICY "Users can update own non-role fields" 
    ON profiles FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id AND role = 'member');

CREATE POLICY "Admins have full profile access" 
    ON profiles FOR ALL USING (is_fitora_admin());

-- 2. MEMBERSHIP PLANS POLICIES
CREATE POLICY "Anyone can view active plans" 
    ON membership_plans FOR SELECT USING (is_active = TRUE OR is_fitora_admin());

CREATE POLICY "Admins manage plans" 
    ON membership_plans FOR ALL USING (is_fitora_admin());

-- 3. MEMBERSHIPS POLICIES
CREATE POLICY "Members view own memberships" 
    ON memberships FOR SELECT USING (auth.uid() = member_id OR is_fitora_admin());

CREATE POLICY "Members can request memberships" 
    ON memberships FOR INSERT WITH CHECK (auth.uid() = member_id);

CREATE POLICY "Admins manage memberships" 
    ON memberships FOR ALL USING (is_fitora_admin());

-- 4. PAYMENTS POLICIES
CREATE POLICY "Members view own payments" 
    ON payments FOR SELECT USING (auth.uid() = member_id OR is_fitora_admin());

CREATE POLICY "Members can record pending payment requests" 
    ON payments FOR INSERT WITH CHECK (auth.uid() = member_id AND payment_status = 'pending');

CREATE POLICY "Admins manage payments" 
    ON payments FOR ALL USING (is_fitora_admin());

-- 5. ATTENDANCE POLICIES
CREATE POLICY "Members view own attendance" 
    ON attendance FOR SELECT USING (auth.uid() = member_id OR is_fitora_admin());

CREATE POLICY "Admins log and manage attendance" 
    ON attendance FOR ALL USING (is_fitora_admin());

-- 6. NOTIFICATIONS POLICIES
CREATE POLICY "Users view and update own notifications" 
    ON notifications FOR SELECT USING (auth.uid() = user_id OR is_fitora_admin());

CREATE POLICY "Users can mark own notifications read" 
    ON notifications FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all notifications" 
    ON notifications FOR ALL USING (is_fitora_admin());

-- 7. RENEWAL REQUESTS POLICIES
CREATE POLICY "Members view and create renewal requests" 
    ON renewal_requests FOR SELECT USING (auth.uid() = member_id OR is_fitora_admin());

CREATE POLICY "Members submit renewal requests" 
    ON renewal_requests FOR INSERT WITH CHECK (auth.uid() = member_id);

CREATE POLICY "Admins manage renewal requests" 
    ON renewal_requests FOR ALL USING (is_fitora_admin());

-- 8. NOTIFICATION LOGS POLICIES
CREATE POLICY "Admins view notification logs" 
    ON notification_logs FOR ALL USING (is_fitora_admin());

-- ====================================================================
-- SEED DATA - ACTIVE MEMBERSHIP PLANS
-- ====================================================================
INSERT INTO membership_plans (plan_name, description, duration_days, price, is_active)
VALUES 
    ('Starter Monthly', 'Ideal for getting started with full gym floor access, cardio zone, and locker facilities.', 30, 49.00, TRUE),
    ('Pro Quarterly', 'Most popular choice. Includes gym floor, specialized workout programs, sauna & steam, plus 1 free consultation.', 90, 129.00, TRUE),
    ('Elite Annual', 'Ultimate commitment with unlimited VIP access, personal trainer check-in, priority recovery spa, and custom meal plans.', 365, 399.00, TRUE)
ON CONFLICT DO NOTHING;

-- Enable Realtime replication on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE memberships;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE renewal_requests;
