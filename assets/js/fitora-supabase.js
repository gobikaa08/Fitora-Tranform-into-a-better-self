/**
 * FITORA Full-Stack Supabase Service Engine
 * Provides complete authentication, database operations, realtime synchronization,
 * and automated membership expiry notification calculations.
 */

(function () {
    'use strict';

    // -------------------------------------------------------------
    // 1. Storage & State Initialization
    // -------------------------------------------------------------
    const STORAGE_KEY_SESSION = 'fitora_auth_session';
    const STORAGE_KEY_PROFILES = 'fitora_db_profiles';
    const STORAGE_KEY_PLANS = 'fitora_db_plans';
    const STORAGE_KEY_MEMBERSHIPS = 'fitora_db_memberships';
    const STORAGE_KEY_PAYMENTS = 'fitora_db_payments';
    const STORAGE_KEY_ATTENDANCE = 'fitora_db_attendance';
    const STORAGE_KEY_NOTIFS = 'fitora_db_notifications';
    const STORAGE_KEY_NOTIF_LOGS = 'fitora_db_notif_logs';

    // Seed default plans if not already initialized
    const DEFAULT_PLANS = [
        {
            id: 'plan-starter-30',
            plan_name: 'Starter Monthly',
            description: 'Full gym floor access, cardio zone, lockers, and basic shower facilities.',
            duration_days: 30,
            price: 49.00,
            is_active: true
        },
        {
            id: 'plan-pro-90',
            plan_name: 'Pro Quarterly',
            description: 'Gym floor, specialized workout programs, sauna & steam, plus 1 free consultation.',
            duration_days: 90,
            price: 129.00,
            is_active: true
        },
        {
            id: 'plan-elite-365',
            plan_name: 'Elite Annual',
            description: 'Unlimited VIP access, personalized trainer check-in, priority recovery spa, and custom meal plans.',
            duration_days: 365,
            price: 399.00,
            is_active: true
        }
    ];

    // Initialize local seed data
    function getStoredData(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function setStoredData(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
        }
    }

    if (!localStorage.getItem(STORAGE_KEY_PLANS)) {
        setStoredData(STORAGE_KEY_PLANS, DEFAULT_PLANS);
    }

    // Default admin seed for demo/offline test readiness
    const DEFAULT_ADMIN = {
        id: 'usr-admin-001',
        full_name: 'FITORA Administrator',
        email: 'admin@fitora.com',
        phone: '+1 (800) 555-3487',
        role: 'admin',
        membership_id: 'FIT-ADMIN-01',
        created_at: new Date().toISOString()
    };

    let profiles = getStoredData(STORAGE_KEY_PROFILES, [DEFAULT_ADMIN]);
    if (!profiles.some(p => p.role === 'admin')) {
        profiles.push(DEFAULT_ADMIN);
        setStoredData(STORAGE_KEY_PROFILES, profiles);
    }

    // -------------------------------------------------------------
    // 2. Supabase Client Setup
    // -------------------------------------------------------------
    const config = window.FITORA_CONFIG || {};
    let supabaseClient = null;

    const hasLiveSupabase = Boolean(
        window.supabase &&
        config.supabaseUrl &&
        config.supabaseKey &&
        !config.supabaseUrl.includes('your-project-id')
    );

    if (hasLiveSupabase) {
        try {
            supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
            console.log('⚡ FITORA connected to live Supabase backend:', config.supabaseUrl);
        } catch (err) {
            console.warn('⚠️ Supabase init failed, falling back to local persistent engine:', err);
        }
    } else {
        console.log('ℹ️ FITORA running on high-performance persistent local backend (Enter Supabase credentials to sync live PostgreSQL).');
    }

    // Helper: Generate Unique Member ID: FIT-YYYY-XXXX
    function generateMembershipId() {
        const year = new Date().getFullYear();
        const rand = Math.floor(1000 + Math.random() * 9000);
        return `FIT-${year}-${rand}`;
    }

    // Helper: Calculate Date Differences & Expiry Status
    function calculateMembershipStatus(expiryDateStr, currentStatus) {
        if (!expiryDateStr) return { status: 'no_membership', daysRemaining: 0, isExpired: true };
        if (currentStatus === 'payment_pending' || currentStatus === 'cancelled') {
            return { status: currentStatus, daysRemaining: 0, isExpired: false };
        }

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const expiry = new Date(expiryDateStr);
        expiry.setHours(0, 0, 0, 0);

        const diffTime = expiry.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let computedStatus = currentStatus;
        let isExpired = false;
        let isExpiringSoon = false;

        if (daysRemaining <= 0) {
            computedStatus = 'expired';
            isExpired = true;
        } else if (daysRemaining <= 7) {
            computedStatus = 'expiring_soon';
            isExpiringSoon = true;
        } else {
            computedStatus = 'active';
        }

        return {
            status: computedStatus,
            daysRemaining: Math.max(0, daysRemaining),
            isExpired,
            isExpiringSoon,
            expiryFormatted: expiry.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        };
    }

    // -------------------------------------------------------------
    // 3. FITORA Service API
    // -------------------------------------------------------------
    const FitoraService = {
        isLiveSupabase: Boolean(supabaseClient),

        // ---------------- AUTHENTICATION ----------------
        async signUp(email, password, fullName, phone) {
            if (supabaseClient) {
                const { data, error } = await supabaseClient.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: fullName, phone: phone }
                    }
                });
                if (error) throw error;
                return data;
            }

            // Local Engine
            const allProfiles = getStoredData(STORAGE_KEY_PROFILES, []);
            if (allProfiles.some(p => p.email.toLowerCase() === email.toLowerCase())) {
                throw new Error('An account with this email already exists.');
            }

            const newId = 'usr-' + Math.random().toString(36).substring(2, 10);
            const newMemId = generateMembershipId();
            const profile = {
                id: newId,
                full_name: fullName,
                email: email,
                phone: phone || '',
                role: 'member',
                membership_id: newMemId,
                password_hash: btoa(password), // simple mock hash
                created_at: new Date().toISOString()
            };

            allProfiles.push(profile);
            setStoredData(STORAGE_KEY_PROFILES, allProfiles);

            const session = { user: profile, token: 'fitora_mock_token_' + newId };
            setStoredData(STORAGE_KEY_SESSION, session);

            // Add Welcome Notification
            this.sendNotification(newId, 'Welcome to FITORA!', `Your athlete profile is ready with Member ID: ${newMemId}. Subscribe to a plan to start.`, 'activation');

            return session;
        },

        async signIn(email, password) {
            if (supabaseClient) {
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email,
                    password
                });
                if (error) throw error;
                // Fetch profile to resolve role
                const profile = await this.getProfile(data.user.id);
                data.user.profile = profile;
                setStoredData(STORAGE_KEY_SESSION, data);
                return data;
            }

            // Local Engine
            const allProfiles = getStoredData(STORAGE_KEY_PROFILES, []);
            const user = allProfiles.find(p => p.email.toLowerCase() === email.toLowerCase());

            if (!user) {
                // If demo admin password
                if (email === 'admin@fitora.com' && password === 'admin123') {
                    const session = { user: DEFAULT_ADMIN, token: 'mock_admin_token' };
                    setStoredData(STORAGE_KEY_SESSION, session);
                    return session;
                }
                throw new Error('Invalid email or password.');
            }

            if (user.password_hash && user.password_hash !== btoa(password)) {
                throw new Error('Incorrect password. Please try again.');
            }

            const session = { user, token: 'fitora_mock_token_' + user.id };
            setStoredData(STORAGE_KEY_SESSION, session);
            return session;
        },

        async signOut() {
            if (supabaseClient) {
                await supabaseClient.auth.signOut();
            }
            localStorage.removeItem(STORAGE_KEY_SESSION);
            window.location.href = 'index.html';
        },

        async getCurrentUser() {
            if (supabaseClient) {
                const { data: { user } } = await supabaseClient.auth.getUser();
                if (!user) return null;
                const profile = await this.getProfile(user.id);
                return { ...user, profile };
            }

            const session = getStoredData(STORAGE_KEY_SESSION, null);
            if (!session || !session.user) return null;

            // Re-fetch latest profile state
            const allProfiles = getStoredData(STORAGE_KEY_PROFILES, []);
            const currentProfile = allProfiles.find(p => p.id === session.user.id) || session.user;
            return { ...session.user, profile: currentProfile };
        },

        async getProfile(userId) {
            if (supabaseClient) {
                const { data, error } = await supabaseClient
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();
                if (error) throw error;
                return data;
            }

            const allProfiles = getStoredData(STORAGE_KEY_PROFILES, []);
            return allProfiles.find(p => p.id === userId) || null;
        },

        // ---------------- MEMBERSHIP PLANS ----------------
        async getPlans(onlyActive = true) {
            if (supabaseClient) {
                let query = supabaseClient.from('membership_plans').select('*');
                if (onlyActive) query = query.eq('is_active', true);
                const { data, error } = await query.order('price', { ascending: true });
                if (error) throw error;
                return data;
            }

            const plans = getStoredData(STORAGE_KEY_PLANS, DEFAULT_PLANS);
            return onlyActive ? plans.filter(p => p.is_active) : plans;
        },

        async createPlan(planData) {
            if (supabaseClient) {
                const { data, error } = await supabaseClient.from('membership_plans').insert([planData]).select().single();
                if (error) throw error;
                return data;
            }

            const plans = getStoredData(STORAGE_KEY_PLANS, DEFAULT_PLANS);
            const newPlan = {
                id: 'plan-' + Math.random().toString(36).substring(2, 9),
                ...planData,
                created_at: new Date().toISOString()
            };
            plans.push(newPlan);
            setStoredData(STORAGE_KEY_PLANS, plans);
            return newPlan;
        },

        async updatePlan(planId, updates) {
            if (supabaseClient) {
                const { data, error } = await supabaseClient.from('membership_plans').update(updates).eq('id', planId).select().single();
                if (error) throw error;
                return data;
            }

            const plans = getStoredData(STORAGE_KEY_PLANS, DEFAULT_PLANS);
            const idx = plans.findIndex(p => p.id === planId);
            if (idx === -1) throw new Error('Plan not found.');
            plans[idx] = { ...plans[idx], ...updates };
            setStoredData(STORAGE_KEY_PLANS, plans);
            return plans[idx];
        },

        async deletePlan(planId) {
            if (supabaseClient) {
                const { error } = await supabaseClient.from('membership_plans').delete().eq('id', planId);
                if (error) throw error;
                return true;
            }

            let plans = getStoredData(STORAGE_KEY_PLANS, DEFAULT_PLANS);
            plans = plans.filter(p => p.id !== planId);
            setStoredData(STORAGE_KEY_PLANS, plans);
            return true;
        },

        // ---------------- MEMBERSHIPS & SUBSCRIPTIONS ----------------
        async getMemberActiveMembership(memberId) {
            const all = await this.getMemberMemberships(memberId);
            if (!all || all.length === 0) return null;

            // Sort by creation or start date descending
            all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            const current = all[0];
            const statusInfo = calculateMembershipStatus(current.expiry_date, current.status);
            return { ...current, statusInfo };
        },

        async getMemberMemberships(memberId) {
            if (supabaseClient) {
                const { data, error } = await supabaseClient
                    .from('memberships')
                    .select('*, membership_plans(*)')
                    .eq('member_id', memberId)
                    .order('created_at', { ascending: false });
                if (error) throw error;
                return data;
            }

            const memberships = getStoredData(STORAGE_KEY_MEMBERSHIPS, []);
            const plans = getStoredData(STORAGE_KEY_PLANS, DEFAULT_PLANS);
            return memberships
                .filter(m => m.member_id === memberId)
                .map(m => ({
                    ...m,
                    membership_plans: plans.find(p => p.id === m.plan_id) || null
                }));
        },

        async getAllMemberships() {
            if (supabaseClient) {
                const { data, error } = await supabaseClient
                    .from('memberships')
                    .select('*, profiles(*), membership_plans(*)')
                    .order('created_at', { ascending: false });
                if (error) throw error;
                return data;
            }

            const memberships = getStoredData(STORAGE_KEY_MEMBERSHIPS, []);
            const profiles = getStoredData(STORAGE_KEY_PROFILES, []);
            const plans = getStoredData(STORAGE_KEY_PLANS, DEFAULT_PLANS);

            return memberships.map(m => {
                const statusInfo = calculateMembershipStatus(m.expiry_date, m.status);
                return {
                    ...m,
                    statusInfo,
                    profiles: profiles.find(p => p.id === m.member_id) || null,
                    membership_plans: plans.find(p => p.id === m.plan_id) || null
                };
            });
        },

        async requestSubscription(memberId, planId, paymentMethod, transactionRef) {
            const plans = await this.getPlans(false);
            const plan = plans.find(p => p.id === planId);
            if (!plan) throw new Error('Selected membership plan was not found.');

            const startDate = new Date();
            const expiryDate = new Date();
            expiryDate.setDate(startDate.getDate() + Number(plan.duration_days));

            const newMemId = 'mem-' + Math.random().toString(36).substring(2, 9);
            const membershipRecord = {
                id: newMemId,
                member_id: memberId,
                plan_id: planId,
                start_date: startDate.toISOString().split('T')[0],
                expiry_date: expiryDate.toISOString().split('T')[0],
                status: 'payment_pending', // requires admin payment confirmation
                created_at: new Date().toISOString()
            };

            const paymentRecord = {
                id: 'pay-' + Math.random().toString(36).substring(2, 9),
                member_id: memberId,
                membership_id: newMemId,
                amount: plan.price,
                payment_method: paymentMethod || 'upi',
                transaction_reference: transactionRef || 'TXN-' + Math.floor(100000 + Math.random() * 900000),
                payment_date: new Date().toISOString(),
                payment_status: 'pending',
                created_at: new Date().toISOString()
            };

            if (supabaseClient) {
                const { data: memData, error: memErr } = await supabaseClient.from('memberships').insert([membershipRecord]).select().single();
                if (memErr) throw memErr;

                paymentRecord.membership_id = memData.id;
                const { data: payData, error: payErr } = await supabaseClient.from('payments').insert([paymentRecord]).select().single();
                if (payErr) throw payErr;

                return { membership: memData, payment: payData };
            }

            // Local engine
            const allMemberships = getStoredData(STORAGE_KEY_MEMBERSHIPS, []);
            allMemberships.push(membershipRecord);
            setStoredData(STORAGE_KEY_MEMBERSHIPS, allMemberships);

            const allPayments = getStoredData(STORAGE_KEY_PAYMENTS, []);
            allPayments.push(paymentRecord);
            setStoredData(STORAGE_KEY_PAYMENTS, allPayments);

            // Notify member
            this.sendNotification(
                memberId,
                'Subscription Requested',
                `Your request for ${plan.plan_name} has been submitted. Status: Payment Pending admin confirmation.`,
                'payment'
            );

            // Notify admins
            this.notifyAdmins(
                'New Subscription Request',
                `A member requested ${plan.plan_name} (${paymentMethod.toUpperCase()}). Pending verification.`,
                'payment'
            );

            return { membership: membershipRecord, payment: paymentRecord };
        },

        async activateMembership(membershipId, paymentId = null) {
            if (supabaseClient) {
                const { data, error } = await supabaseClient
                    .from('memberships')
                    .update({ status: 'active' })
                    .eq('id', membershipId)
                    .select()
                    .single();
                if (error) throw error;

                if (paymentId) {
                    await supabaseClient.from('payments').update({ payment_status: 'confirmed' }).eq('id', paymentId);
                }
                return data;
            }

            const allMemberships = getStoredData(STORAGE_KEY_MEMBERSHIPS, []);
            const mIdx = allMemberships.findIndex(m => m.id === membershipId);
            if (mIdx === -1) throw new Error('Membership not found.');

            allMemberships[mIdx].status = 'active';
            setStoredData(STORAGE_KEY_MEMBERSHIPS, allMemberships);

            if (paymentId) {
                const allPayments = getStoredData(STORAGE_KEY_PAYMENTS, []);
                const pIdx = allPayments.findIndex(p => p.id === paymentId);
                if (pIdx !== -1) {
                    allPayments[pIdx].payment_status = 'confirmed';
                    setStoredData(STORAGE_KEY_PAYMENTS, allPayments);
                }
            }

            const memberId = allMemberships[mIdx].member_id;
            this.sendNotification(
                memberId,
                'Membership Activated!',
                `Congratulations! Your FITORA membership is now ACTIVE. Enjoy full gym privileges!`,
                'activation'
            );

            return allMemberships[mIdx];
        },

        // ---------------- PAYMENTS ----------------
        async getMemberPayments(memberId) {
            if (supabaseClient) {
                const { data, error } = await supabaseClient
                    .from('payments')
                    .select('*')
                    .eq('member_id', memberId)
                    .order('payment_date', { ascending: false });
                if (error) throw error;
                return data;
            }

            const payments = getStoredData(STORAGE_KEY_PAYMENTS, []);
            return payments.filter(p => p.member_id === memberId).sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
        },

        async getAllPayments() {
            if (supabaseClient) {
                const { data, error } = await supabaseClient
                    .from('payments')
                    .select('*, profiles(*)')
                    .order('payment_date', { ascending: false });
                if (error) throw error;
                return data;
            }

            const payments = getStoredData(STORAGE_KEY_PAYMENTS, []);
            const profiles = getStoredData(STORAGE_KEY_PROFILES, []);
            return payments.map(p => ({
                ...p,
                profiles: profiles.find(prof => prof.id === p.member_id) || null
            })).sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
        },

        async confirmPayment(paymentId) {
            if (supabaseClient) {
                const { data, error } = await supabaseClient
                    .from('payments')
                    .update({ payment_status: 'confirmed' })
                    .eq('id', paymentId)
                    .select()
                    .single();
                if (error) throw error;
                if (data.membership_id) {
                    await this.activateMembership(data.membership_id);
                }
                return data;
            }

            const payments = getStoredData(STORAGE_KEY_PAYMENTS, []);
            const pIdx = payments.findIndex(p => p.id === paymentId);
            if (pIdx === -1) throw new Error('Payment record not found.');

            payments[pIdx].payment_status = 'confirmed';
            setStoredData(STORAGE_KEY_PAYMENTS, payments);

            if (payments[pIdx].membership_id) {
                await this.activateMembership(payments[pIdx].membership_id);
            }
            return payments[pIdx];
        },

        // ---------------- ATTENDANCE ----------------
        async getMemberAttendance(memberId) {
            if (supabaseClient) {
                const { data, error } = await supabaseClient
                    .from('attendance')
                    .select('*')
                    .eq('member_id', memberId)
                    .order('check_in', { ascending: false });
                if (error) throw error;
                return data;
            }

            const list = getStoredData(STORAGE_KEY_ATTENDANCE, []);
            return list.filter(a => a.member_id === memberId).sort((a, b) => new Date(b.check_in) - new Date(a.check_in));
        },

        async getAllAttendance(dateFilter = null) {
            if (supabaseClient) {
                let query = supabaseClient.from('attendance').select('*, profiles(*)');
                if (dateFilter) query = query.eq('attendance_date', dateFilter);
                const { data, error } = await query.order('check_in', { ascending: false });
                if (error) throw error;
                return data;
            }

            const list = getStoredData(STORAGE_KEY_ATTENDANCE, []);
            const profiles = getStoredData(STORAGE_KEY_PROFILES, []);
            const filtered = dateFilter ? list.filter(a => a.attendance_date === dateFilter) : list;
            return filtered.map(a => ({
                ...a,
                profiles: profiles.find(p => p.id === a.member_id) || null
            })).sort((a, b) => new Date(b.check_in) - new Date(a.check_in));
        },

        async checkInMember(identifier) {
            // Identifier can be full_name, email, or member_id (e.g. FIT-2026-XXXX)
            const profiles = getStoredData(STORAGE_KEY_PROFILES, []);
            const target = profiles.find(p => 
                p.membership_id === identifier || 
                p.email.toLowerCase() === identifier.toLowerCase() ||
                p.full_name.toLowerCase() === identifier.toLowerCase() ||
                p.id === identifier
            );

            if (!target) {
                throw new Error(`No member found matching identifier: "${identifier}".`);
            }

            // CRITICAL CHECK: Verify active membership! Expired / inactive members CANNOT check in!
            const membership = await this.getMemberActiveMembership(target.id);
            if (!membership || membership.statusInfo.status !== 'active') {
                const state = membership ? membership.statusInfo.status.replace('_', ' ').toUpperCase() : 'NO MEMBERSHIP';
                throw new Error(`Access Denied! Member ${target.full_name} has status [${state}]. Must have an ACTIVE membership to enter gym floor.`);
            }

            const today = new Date().toISOString().split('T')[0];
            const allAttendance = getStoredData(STORAGE_KEY_ATTENDANCE, []);

            // Duplicate check-in prevention
            const existing = allAttendance.find(a => a.member_id === target.id && a.attendance_date === today && !a.check_out);
            if (existing) {
                throw new Error(`Member ${target.full_name} is already checked in today at ${new Date(existing.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`);
            }

            const record = {
                id: 'att-' + Math.random().toString(36).substring(2, 9),
                member_id: target.id,
                check_in: new Date().toISOString(),
                check_out: null,
                attendance_date: today,
                created_at: new Date().toISOString()
            };

            if (supabaseClient) {
                const { data, error } = await supabaseClient.from('attendance').insert([record]).select('*, profiles(*)').single();
                if (error) throw error;
                return data;
            }

            allAttendance.push(record);
            setStoredData(STORAGE_KEY_ATTENDANCE, allAttendance);

            return { ...record, profiles: target };
        },

        async checkOutMember(attendanceId) {
            const checkOutTime = new Date().toISOString();

            if (supabaseClient) {
                const { data, error } = await supabaseClient
                    .from('attendance')
                    .update({ check_out: checkOutTime })
                    .eq('id', attendanceId)
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }

            const allAttendance = getStoredData(STORAGE_KEY_ATTENDANCE, []);
            const idx = allAttendance.findIndex(a => a.id === attendanceId);
            if (idx === -1) throw new Error('Attendance entry not found.');

            allAttendance[idx].check_out = checkOutTime;
            setStoredData(STORAGE_KEY_ATTENDANCE, allAttendance);
            return allAttendance[idx];
        },

        // ---------------- NOTIFICATIONS & AUTOMATED EXPIRY CHECKS ----------------
        async getUserNotifications(userId) {
            if (supabaseClient) {
                const { data, error } = await supabaseClient
                    .from('notifications')
                    .select('*')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false });
                if (error) throw error;
                return data;
            }

            const notifs = getStoredData(STORAGE_KEY_NOTIFS, []);
            return notifs.filter(n => n.user_id === userId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        },

        async markNotificationRead(notifId) {
            if (supabaseClient) {
                await supabaseClient.from('notifications').update({ is_read: true }).eq('id', notifId);
                return true;
            }

            const notifs = getStoredData(STORAGE_KEY_NOTIFS, []);
            const idx = notifs.findIndex(n => n.id === notifId);
            if (idx !== -1) {
                notifs[idx].is_read = true;
                setStoredData(STORAGE_KEY_NOTIFS, notifs);
            }
            return true;
        },

        async sendNotification(userId, title, message, type = 'system') {
            const newNotif = {
                id: 'notif-' + Math.random().toString(36).substring(2, 9),
                user_id: userId,
                title,
                message,
                notification_type: type,
                is_read: false,
                created_at: new Date().toISOString()
            };

            if (supabaseClient) {
                await supabaseClient.from('notifications').insert([newNotif]);
                return newNotif;
            }

            const notifs = getStoredData(STORAGE_KEY_NOTIFS, []);
            notifs.push(newNotif);
            setStoredData(STORAGE_KEY_NOTIFS, notifs);
            return newNotif;
        },

        async notifyAdmins(title, message, type = 'system') {
            const profiles = getStoredData(STORAGE_KEY_PROFILES, []);
            const admins = profiles.filter(p => p.role === 'admin');
            for (const admin of admins) {
                await this.sendNotification(admin.id, title, message, type);
            }
        },

        // Automated Expiry Check Engine (7d, 3d, 1d, on expiry, post expiry)
        async runAutomatedExpiryChecks() {
            const allMemberships = await this.getAllMemberships();
            const logs = getStoredData(STORAGE_KEY_NOTIF_LOGS, []);
            let alertsTriggered = 0;

            for (const m of allMemberships) {
                if (m.status !== 'active' && m.status !== 'expiring_soon') continue;

                const statusInfo = calculateMembershipStatus(m.expiry_date, m.status);
                const days = statusInfo.daysRemaining;
                let reminderKey = null;
                let msg = '';

                if (days <= 0) {
                    reminderKey = 'on_expiry';
                    msg = `Your FITORA membership has expired. Please contact the gym or renew your subscription to maintain floor access.`;
                    // Mark membership expired
                    m.status = 'expired';
                } else if (days === 1) {
                    reminderKey = '1_day';
                    msg = `URGENT: Your FITORA membership expires tomorrow. Renew now to avoid interruption.`;
                } else if (days <= 3) {
                    reminderKey = '3_days';
                    msg = `Your FITORA membership expires in ${days} days. Renew your membership to continue enjoying your fitness journey.`;
                } else if (days <= 7) {
                    reminderKey = '7_days';
                    msg = `Reminder: Your FITORA membership expires in ${days} days. Early renewal options are available.`;
                }

                if (reminderKey) {
                    const logId = `${m.id}_${reminderKey}`;
                    const alreadySent = logs.some(l => l.log_id === logId);

                    if (!alreadySent) {
                        logs.push({ log_id: logId, membership_id: m.id, reminder_type: reminderKey, sent_at: new Date().toISOString() });
                        await this.sendNotification(m.member_id, 'Membership Expiry Alert', msg, 'expiry');

                        // Notify admins of impending expiries
                        const memberName = m.profiles ? m.profiles.full_name : 'Member';
                        await this.notifyAdmins('Upcoming Expiry Alert', `${memberName}'s membership expires in ${days} day(s).`, 'expiry');

                        alertsTriggered++;
                    }
                }
            }

            setStoredData(STORAGE_KEY_NOTIF_LOGS, logs);
            setStoredData(STORAGE_KEY_MEMBERSHIPS, allMemberships);
            return { alertsTriggered, checkedAt: new Date().toISOString() };
        }
    };

    // Attach to global window
    window.FitoraService = FitoraService;

    // Run background expiry check upon initial script load
    try {
        FitoraService.runAutomatedExpiryChecks();
    } catch (e) {
        console.error('Initial expiry check failed:', e);
    }

})();
