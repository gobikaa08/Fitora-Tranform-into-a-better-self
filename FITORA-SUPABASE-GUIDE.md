# FITORA – Real-Time Gym Membership Management Platform
## Complete Architecture, Database Integration & Deployment Manual

Welcome to **FITORA**, transformed from a static website into a fully functional, real-world **Gym Membership and Management SaaS Platform**.

---

## 1. System Architecture Overview

```
                        +---------------------------------------------+
                        |            FITORA Public Website            |
                        |      (Minimalist Landing, Plans, Hero)      |
                        +----------------------+----------------------+
                                               |
                        +----------------------+----------------------+
                        |         Authentication Engine               |
                        |     (auth.html - Supabase Auth & RLS)       |
                        +-----------+---------------------+-----------+
                                    |                     |
                 [Role: Member]     |                     |    [Role: Admin]
                                    v                     v
+-------------------------------------+   +---------------------------------------+
|       Athlete Member Portal         |   |          Admin Gym Console            |
|          (dashboard.html)           |   |             (admin.html)              |
+-------------------------------------+   +---------------------------------------+
| • Active Membership Validity Card   |   | • Live Financial & Attendance Metrics |
| • Expiry Countdown (Days Left)      |   | • Member Directory & Profile Search   |
| • One-Click Subscription & Renewal  |   | • Subscription Activation & Renewals  |
| • Personal Attendance History       |   | • Front Desk Member Check-In/Out      |
| • Payment Records & Digital Receipts|   | • Payment Verification & Confirmations|
| • In-App & Email Expiry Alerts      |   | • Membership Plans CRUD Management    |
+-------------------------------------+   +---------------------------------------+
                                    |                     |
                                    +----------+----------+
                                               |
                                               v
                        +---------------------------------------------+
                        |             Supabase PostgreSQL             |
                        | (8 Tables, RLS, Realtime & Automated Crons) |
                        +---------------------------------------------+
```

---

## 2. Supabase Database Schema

The database is built on PostgreSQL with **Row Level Security (RLS)** and automated triggers:

1. **`profiles`**: Athlete and administrator profiles, roles (`member`, `admin`), unique Member IDs (`FIT-YYYY-XXXX`).
2. **`membership_plans`**: Available gym plans, durations in days (e.g. 30, 90, 365), pricing, active flags.
3. **`memberships`**: Member subscriptions, start dates, calculated expiry dates, statuses (`active`, `expiring_soon`, `payment_pending`, `expired`, `cancelled`).
4. **`payments`**: Payment records, methods (`cash`, `upi`, `card`, `bank_transfer`), transaction references, statuses (`confirmed`, `pending`, `rejected`).
5. **`attendance`**: Daily gym check-ins and check-outs with duplicate protection (`unique_daily_member_checkin`).
6. **`notifications`**: In-app and simulated email notifications, types (`expiry`, `activation`, `payment`, `renewal`, `system`), read/unread statuses.
7. **`renewal_requests`**: Member renewal requests pending gym admin review.
8. **`notification_logs`**: Deduplication logs ensuring athletes only receive one notification per reminder window (`7_days`, `3_days`, `1_day`, `on_expiry`, `post_expiry`).

---

## 3. Quick Setup: Connecting Your Live Supabase Backend

### Step 1: Create a Supabase Project
1. Log in to [Supabase](https://supabase.com/).
2. Click **New Project** and choose a name (e.g. `fitora-gym`).

### Step 2: Execute Database Migrations
1. Open your project on Supabase and navigate to the **SQL Editor** tab (left sidebar).
2. Open the file `supabase-setup.sql` in this repository.
3. Paste the entire contents into the SQL Editor and click **Run**.
4. All 8 tables, indexes, triggers, seed plans, and RLS policies are created in seconds.

### Step 3: Configure Frontend Credentials
1. In Supabase, go to **Project Settings** -> **API**.
2. Copy the **Project URL** and the **anon public key**.
3. Open `assets/js/fitora-config.js` and paste them:
   ```javascript
   window.FITORA_CONFIG = {
       supabaseUrl: 'https://your-project-id.supabase.co',
       supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
       gymName: 'FITORA - Fitness & Wellness',
       currencySymbol: '$',
       version: '4.0.0'
   };
   ```

*(Note: If tested without live credentials, FITORA automatically operates in persistent local mode so every single feature—from registration to check-ins—can be demoed immediately).*

---

## 4. Key Workflows

### Member Workflow:
1. **Browse Plans**: Visit homepage `index.html#membership`.
2. **Register/Login**: Enter details at `auth.html`. Role is automatically set to `member`.
3. **Subscribe**: Choose plan and payment method (Cash, UPI, Card, Transfer). Status becomes `payment_pending`.
4. **Access Dashboard**: View active validity, remaining days, check-in log, payment history, and downloadable receipts.
5. **Renewal**: Request plan extension before or after expiry.

### Administrator Workflow:
1. **Login**: Sign in at `auth.html` (Demo: `admin@fitora.com` / `admin123`).
2. **Admin Portal**: Automatically routes to `admin.html`.
3. **Verify Payments**: Review pending transactions and click **Confirm**—which automatically activates the member's subscription!
4. **Front Desk Check-In**: Type Member ID or name. If active, check-in is logged with timestamp; if expired or inactive, entry is immediately denied!
5. **Plan Management**: Create, edit, and delete membership tiers dynamically.
6. **Expiry Checks**: Trigger manual or automated expiry scans with notification deduplication.

---

## 5. Deployment

- **Vercel**: Works out of the box with `vercel.json` or static serving.
- **GitHub Pages**: Root folder contains `index.html` and `.nojekyll`.
- **Local Testing**: Run `node serve.js` and visit `http://localhost:3000`.
