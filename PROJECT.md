# FITORA - Premium Fitness & Wellness Platform

## 1. Project Overview

FITORA is a modern, high-performance web platform designed for a premium fitness club, personal training academy, and athletic wellness brand. Built with a bold dark-aesthetic design system (deep charcoal backgrounds with high-contrast electric lime accents), FITORA provides gym enthusiasts and newcomers alike with training programs, class schedules, interactive fitness calculators, coach booking, membership tiers, and an integrated activewear and nutrition pro shop.

## 2. Brand Identity & Design System

- **Brand Name:** FITORA
- **Tagline:** "Elevate Your Strength. Transform Your Life."
- **Brand Colors:**
  - Primary Background: `#111312` (Deep Charcoal)
  - Secondary Background: `#1C211F` (Dark Slate)
  - Accent Color: `#C5F36A` (Electric Lime)
  - Primary Text: `#F5F5F0` (Off-White)
  - Secondary Text: `#A6AAA6` (Muted Grey)
  - Card Background: `#202522` / `#181B19`
- **Typography:**
  - Headings: `Montserrat`, sans-serif (700-800 weight)
  - Body: `Inter`, sans-serif (400-600 weight)

## 3. Technology Stack

- **Frontend:** HTML5, CSS3, JavaScript (ES6+), Bootstrap 5, Font Awesome 6, Swiper.js, GSAP, Nice Select, Magnific Popup
- **Backend / Server:** Node.js HTTP server (`serve.js`), Nodemailer for SMTP messaging
- **APIs:**
  - `/send-message`: Contact form processing with email notification
  - `/api/book-trial`: Free 1-day VIP gym pass and coach consultation booking
  - `/api/newsletter`: Inner circle workout & nutrition tips subscription
  - `/api/checkout`: Pro Shop order processing with unique order ID generation

## 4. Key Application Modules & Pages

1. **Homepage (`index.html`):**
   - Hero slider with athletic video/photography backgrounds
   - Interactive BMI & Calorie Calculator widget
   - Weekly interactive class schedule with day filters
   - Featured training programs (Strength, Personal, Yoga, Cardio)
   - Trainer spotlights and credentials
   - Membership plans with Monthly / Annual toggle (20% savings)
   - Real-time client transformation testimonials
   - Free Trial VIP Pass modal

2. **About FITORA (`about.html`):**
   - Brand philosophy, 10+ years track record, equipment standards
   - Facility amenities, wellness zones, recovery lounges
   - Core coaching principles

3. **Programs & Services (`programs.html` / `service.html`):**
   - Strength & Hypertrophy, High-Intensity HIIT, Functional Mobility, Combat/Boxing, Nutrition Coaching
   - Difficulty ratings, duration, target muscle groups, and coach assignments

4. **Weekly Class Timetable (`schedule.html`):**
   - Filterable schedule by day of week and workout style
   - Trainer assigned, time slot, studio room, difficulty badge, and 1-click spot reservation

5. **Fitness & Nutrition Calculators (`calculator.html`):**
   - Body Mass Index (BMI) calculator with visual category gauge
   - Total Daily Energy Expenditure (TDEE) and BMR estimation
   - Macronutrient split generator (Proteins, Fats, Carbs) based on fitness goal
   - One-Rep Max (1RM) strength estimator

6. **Membership & Pricing (`pricing.html`):**
   - Tiered plans: Basic ($29/mo), Premium ($59/mo), Elite ($99/mo)
   - Monthly vs Annual switch with discount badge
   - Feature comparison matrix
   - Day passes, personal training packs, and FAQ

7. **FITORA Pro Shop (`shop.html` / `shop-grid.html`):**
   - Activewear, performance supplements (Whey isolate, Creatine, Pre-workout), lifting gear
   - Category filters, product search, ratings, and instant Add to Cart

8. **Cart & Checkout (`shop-cart.html`, `checkout.html`):**
   - Interactive local cart with quantity adjustment, promo code (`FITORA20`), order breakdown
   - Checkout flow with order confirmation

9. **Trainers & Coaches (`trainers.html` / `team.html`):**
   - Elite coaches, certifications, training philosophies, and consultation booking

10. **Frequently Asked Questions (`faq.html`):**
    - Categorized accordion answering common gym, membership, and policy questions

11. **Contact & Location (`contact.html`):**
    - Direct contact form, gym address, interactive map guide, opening hours, support links

12. **Custom 404 Error (`404.html`):**
    - Fitness-themed 404 page directing users back to workouts and programs

## 5. Running the Project

```bash
npm start
# or
node serve.js
```
The server will start on `http://localhost:3000` (or `PORT` environment variable) and automatically launch your browser.
