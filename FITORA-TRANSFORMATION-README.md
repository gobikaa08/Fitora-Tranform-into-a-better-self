# FITORA - Premium Fitness & Wellness Platform

## 🎯 Full Transformation & Feature Expansion

The project has been completely transformed and upgraded into **FITORA**, an elite fitness, wellness, and activewear platform. All leftover files, templates, documentation, and assets from the previous template have been eliminated, and modern interactive modules have been built.

---

## 🎨 Brand Identity

- **Brand:** FITORA
- **Tagline:** *Elevate Your Strength. Transform Your Life.*
- **Colors:**
  - Charcoal Background: `#111312`
  - Slate Dark Grey: `#1C211F`
  - Electric Lime Accent: `#C5F36A`
  - Off-White Text: `#F5F5F0`
  - Muted Grey: `#A6AAA6`
- **Typography:** Montserrat (Headings) + Inter (Body)

---

## 🚀 New Features & Capabilities

### 1. Interactive BMI & Calorie Calculator (`calculator.html` + Homepage widget)
- Clinical Mifflin-St Jeor formula calculating:
  - Body Mass Index (BMI) and health category
  - Total Daily Energy Expenditure (TDEE) and BMR
  - Daily calorie targets for fat loss (-500 kcal) and muscle hypertrophy (+350 kcal)
  - Daily protein target (2g/kg body weight)
- 1-Rep Max (1RM) Estimator using the Epley formula for Squat, Bench, and Deadlift.

### 2. Interactive Weekly Class Timetable (`schedule.html` + Homepage section)
- Day tabs (Monday through Sunday)
- Category filters (Strength, Metabolic HIIT, Yoga & Mobility, Combat & Boxing)
- Real-time card display with time slot, studio room, difficulty badge, coach name, and 1-click spot reservation.

### 3. FITORA Pro Shop & Activewear (`shop-grid.html` / `shop.html`)
- Performance supplements (Hydro Whey Isolate, Creatine Monohydrate, Pre-Workout Matrix)
- Athletic apparel (Tactical Gym Hoodie, Seamless Compression Tee)
- Lifting gear (Heavy-Duty Lifting Straps, Lever Belts, Insulated Shakers)
- Category filter pills and instant "Add to Cart" with toast feedback.

### 4. Interactive Shopping Cart (`shop-cart.html`)
- Persisted in `localStorage` across page reloads
- Quantity increment / decrement and item deletion
- Promo coupon code system (use code `FITORA20` for 20% off!)
- Free shipping threshold ($50+) calculation and live total update
- Dynamic cart badge count in the header across all pages.

### 5. Streamlined Checkout & Order Processing (`checkout.html`)
- Shipping and billing address fields
- Payment method selector (Credit/Debit Card, Apple Pay, Pay at Gym Desk Pickup)
- Order submission to `/api/checkout` with instant unique Order ID (`FIT-XXXXXX`) generation and receipt confirmation.

### 6. Dynamic Pricing with Annual / Monthly Switch (`pricing.html`)
- Monthly vs Annual billing toggle with 20% automatic discount calculation
- Side-by-side 10-point feature comparison matrix
- Single-day guest passes and personal coaching packages.

### 7. Free 1-Day VIP Pass / Consultation Modal
- Can be triggered from any page via "Free Pass" button
- Collects name, email, phone, preferred date, primary training goal, and specific class
- Sends to `/api/book-trial` with toast confirmation.

### 8. Elite Coaches Directory (`team.html` / `trainers.html`)
- Head trainers across strength, mobility, decathlon conditioning, sports dietetics, combat boxing, and physiotherapy.

### 9. Categorized & Searchable FAQ (`faq.html`)
- Real-time keyword filter across gym memberships, freeze policies, spa guidelines, and shipping.

### 10. Direct Contact Concierge (`contact.html`)
- Connects to `/send-message` with email notifications.

### 11. Custom Fitness 404 Error Page (`404.html`)
- "Dropped the barbell?" custom recovery screen.

---

## 📁 Clean Directory Architecture (GitHub Pages Ready)

```
FITORA/
├── assets/
│   ├── css/ (fitora-custom.css, main.css, bootstrap, all.min.css)
│   ├── js/ (fitora-app.js, main.js, bootstrap.bundle, etc.)
│   ├── img/ (logos, hero, programs, trainers, testimonials, favicon)
│   ├── scss/
│   └── webfonts/
├── index.html
├── about.html
├── service.html / programs.html
├── schedule.html
├── calculator.html
├── shop-grid.html / shop.html
├── shop-cart.html
├── checkout.html
├── pricing.html
├── team.html / trainers.html
├── faq.html
├── contact.html
├── 404.html
├── .nojekyll
├── serve.js
├── package.json
└── PROJECT.md
```

---

## ⚡ How to Run

```bash
npm start
# or
node serve.js
```
Open **`http://localhost:3000`** in your browser.
