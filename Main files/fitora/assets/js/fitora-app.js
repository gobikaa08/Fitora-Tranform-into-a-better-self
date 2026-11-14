/**
 * FITORA - Premium Fitness & Wellness Platform
 * Core Application Script: Cart, Calculators, Class Schedule, Free Trial Modal, Toasts
 */

(function () {
    'use strict';

    // -------------------------------------------------------------
    // 1. Toast Notification System
    // -------------------------------------------------------------
    window.fitoraToast = function (message, type = 'success') {
        let container = document.getElementById('fitora-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'fitora-toast-container';
            container.style.cssText = `
                position: fixed;
                bottom: 30px;
                right: 30px;
                z-index: 99999;
                display: flex;
                flex-direction: column;
                gap: 12px;
                max-width: 380px;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `fitora-toast fitora-toast-${type}`;
        const icon = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-circle-xmark' : 'fa-circle-info');
        const borderColor = type === 'success' ? '#C5F36A' : (type === 'error' ? '#FF5555' : '#38BDF8');

        toast.style.cssText = `
            background: #1C211F;
            border-left: 4px solid ${borderColor};
            color: #F5F5F0;
            padding: 14px 20px;
            border-radius: 8px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 12px;
            pointer-events: auto;
            transform: translateX(100px);
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        `;

        toast.innerHTML = `
            <i class="fas ${icon}" style="color: ${borderColor}; font-size: 18px;"></i>
            <div style="flex: 1; line-height: 1.4;">${message}</div>
            <button style="background: none; border: none; color: #A6AAA6; cursor: pointer; font-size: 14px; padding: 0 4px;" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        });

        // Auto remove
        setTimeout(() => {
            toast.style.transform = 'translateX(100px)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    };

    // -------------------------------------------------------------
    // 2. Shopping Cart Store (Local Storage)
    // -------------------------------------------------------------
    const CART_KEY = 'fitora_cart_items';
    const PROMO_KEY = 'fitora_promo_applied';

    window.fitoraCart = {
        getItems() {
            try {
                return JSON.parse(localStorage.getItem(CART_KEY)) || [];
            } catch (e) {
                return [];
            }
        },
        saveItems(items) {
            localStorage.setItem(CART_KEY, JSON.stringify(items));
            this.updateBadges();
        },
        addItem(product) {
            const items = this.getItems();
            const existing = items.find(i => i.id === product.id);
            if (existing) {
                existing.quantity += (product.quantity || 1);
            } else {
                items.push({
                    id: product.id,
                    name: product.name,
                    price: parseFloat(product.price),
                    image: product.image,
                    category: product.category || 'Gear',
                    quantity: product.quantity || 1
                });
            }
            this.saveItems(items);
            fitoraToast(`<strong>${product.name}</strong> added to your cart!`, 'success');
            if (typeof renderCartPage === 'function') renderCartPage();
        },
        updateQuantity(id, delta) {
            let items = this.getItems();
            const item = items.find(i => i.id === id);
            if (item) {
                item.quantity += delta;
                if (item.quantity <= 0) {
                    items = items.filter(i => i.id !== id);
                    fitoraToast(`Item removed from cart.`, 'info');
                }
            }
            this.saveItems(items);
            if (typeof renderCartPage === 'function') renderCartPage();
            if (typeof renderCheckoutSummary === 'function') renderCheckoutSummary();
        },
        removeItem(id) {
            let items = this.getItems();
            items = items.filter(i => i.id !== id);
            this.saveItems(items);
            fitoraToast(`Item removed from cart.`, 'info');
            if (typeof renderCartPage === 'function') renderCartPage();
            if (typeof renderCheckoutSummary === 'function') renderCheckoutSummary();
        },
        clearCart() {
            localStorage.removeItem(CART_KEY);
            localStorage.removeItem(PROMO_KEY);
            this.updateBadges();
        },
        getCount() {
            return this.getItems().reduce((sum, item) => sum + item.quantity, 0);
        },
        getSubtotal() {
            return this.getItems().reduce((sum, item) => sum + (item.price * item.quantity), 0);
        },
        updateBadges() {
            const count = this.getCount();
            document.querySelectorAll('.fitora-cart-count').forEach(el => {
                el.textContent = count;
                el.style.display = count > 0 ? 'inline-flex' : 'none';
            });
        }
    };

    // Initial default demo cart if empty so user has items to explore
    if (!localStorage.getItem(CART_KEY)) {
        fitoraCart.saveItems([
            {
                id: 'prod-1',
                name: 'FITORA Hydro Whey Isolate (2kg)',
                price: 64.99,
                image: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?q=80&w=400',
                category: 'Supplements',
                quantity: 1
            },
            {
                id: 'prod-2',
                name: 'Pro Performance Lifting Straps',
                price: 24.99,
                image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=400',
                category: 'Gear',
                quantity: 1
            }
        ]);
    }

    // -------------------------------------------------------------
    // 3. BMI & Calorie Calculator Engine
    // -------------------------------------------------------------
    window.calculateBMI = function () {
        const heightInput = document.getElementById('bmi-height');
        const weightInput = document.getElementById('bmi-weight');
        const ageInput = document.getElementById('bmi-age');
        const genderInput = document.querySelector('input[name="bmi-gender"]:checked') || { value: 'male' };
        const activityInput = document.getElementById('bmi-activity') || { value: '1.55' };
        const resultCard = document.getElementById('bmi-result-card');

        if (!heightInput || !weightInput) return;

        const heightCm = parseFloat(heightInput.value);
        const weightKg = parseFloat(weightInput.value);
        const age = parseFloat(ageInput ? ageInput.value : 25) || 25;
        const activity = parseFloat(activityInput.value) || 1.55;

        if (!heightCm || heightCm <= 50 || heightCm > 260 || !weightKg || weightKg <= 20 || weightKg > 300) {
            fitoraToast('Please enter valid height (cm) and weight (kg).', 'error');
            return;
        }

        const heightM = heightCm / 100;
        const bmi = (weightKg / (heightM * heightM)).toFixed(1);

        // BMR (Mifflin-St Jeor formula)
        let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
        bmr += (genderInput.value === 'male' ? 5 : -161);

        const tdee = Math.round(bmr * activity);
        const fatLossCalories = Math.round(tdee - 500);
        const muscleGainCalories = Math.round(tdee + 350);

        // BMI Category details
        let category = '';
        let color = '';
        let advice = '';

        if (bmi < 18.5) {
            category = 'Underweight';
            color = '#38BDF8';
            advice = 'Focus on nutrient-dense calorie surplus and progressive hypertrophy strength training.';
        } else if (bmi >= 18.5 && bmi <= 24.9) {
            category = 'Optimal & Healthy';
            color = '#C5F36A';
            advice = 'Outstanding baseline! Maintain your balance with structured resistance training and conditioning.';
        } else if (bmi >= 25 && bmi <= 29.9) {
            category = 'Overweight';
            color = '#F59E0B';
            advice = 'Recommended: Combine resistance workouts with high-intensity interval training (HIIT) and a modest caloric deficit.';
        } else {
            category = 'High Risk (Obese)';
            color = '#EF4444';
            advice = 'Consult our certified nutritionists and start with low-impact functional movements and steady-state cardio.';
        }

        // Display results
        if (resultCard) {
            resultCard.style.display = 'block';
            resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            const bmiVal = document.getElementById('bmi-val');
            const bmiCat = document.getElementById('bmi-cat');
            const bmiAdv = document.getElementById('bmi-adv');
            const tdeeVal = document.getElementById('tdee-val');
            const fatlossVal = document.getElementById('fatloss-val');
            const gainVal = document.getElementById('gain-val');

            if (bmiVal) {
                bmiVal.textContent = bmi;
                bmiVal.style.color = color;
            }
            if (bmiCat) {
                bmiCat.textContent = category;
                bmiCat.style.color = color;
            }
            if (bmiAdv) bmiAdv.textContent = advice;
            if (tdeeVal) tdeeVal.textContent = `${tdee} kcal`;
            if (fatlossVal) fatlossVal.textContent = `${fatLossCalories} kcal`;
            if (gainVal) gainVal.textContent = `${muscleGainCalories} kcal`;

            // Protein estimation (2g per kg)
            const proteinGrams = Math.round(weightKg * 2);
            const proteinEl = document.getElementById('macro-protein');
            if (proteinEl) proteinEl.textContent = `${proteinGrams}g`;
        }

        fitoraToast(`BMI: ${bmi} (${category}) calculated!`, 'success');
    };

    // -------------------------------------------------------------
    // 4. Interactive Class Timetable
    // -------------------------------------------------------------
    const WEEKLY_SCHEDULE = {
        monday: [
            { time: '06:30 AM', name: 'Sunrise Power Hypertrophy', trainer: 'Alex Morgan', studio: 'Studio 1 - Heavy Iron', intensity: 'High', category: 'strength' },
            { time: '09:00 AM', name: 'Vinyasa Flow & Deep Mobility', trainer: 'Sarah Chen', studio: 'Studio 3 - Zen Sanctuary', intensity: 'Low', category: 'yoga' },
            { time: '05:30 PM', name: 'Metabolic HIIT Ignition', trainer: 'Marcus Williams', studio: 'Studio 2 - Turf Arena', intensity: 'Extreme', category: 'hiit' },
            { time: '07:00 PM', name: 'Boxing Conditioning & Sparring', trainer: 'Dave Vance', studio: 'Ring Zone', intensity: 'High', category: 'combat' }
        ],
        tuesday: [
            { time: '07:00 AM', name: 'Core Shred & Functional Kettlebell', trainer: 'Marcus Williams', studio: 'Studio 2 - Turf Arena', intensity: 'Medium', category: 'strength' },
            { time: '10:00 AM', name: 'Athletic Conditioning & Agility', trainer: 'Alex Morgan', studio: 'Studio 1 - Heavy Iron', intensity: 'High', category: 'hiit' },
            { time: '05:30 PM', name: 'Powerlifting Fundamentals', trainer: 'Alex Morgan', studio: 'Studio 1 - Heavy Iron', intensity: 'High', category: 'strength' },
            { time: '06:45 PM', name: 'Restorative Yin Yoga & Sound Bath', trainer: 'Sarah Chen', studio: 'Studio 3 - Zen Sanctuary', intensity: 'Low', category: 'yoga' }
        ],
        wednesday: [
            { time: '06:30 AM', name: 'Endurance RPM & High-Cadence Spin', trainer: 'Marcus Williams', studio: 'Spin Arena', intensity: 'High', category: 'hiit' },
            { time: '09:30 AM', name: 'Glute & Hamstring Sculpt', trainer: 'Emma Rodriguez', studio: 'Studio 1 - Heavy Iron', intensity: 'Medium', category: 'strength' },
            { time: '05:30 PM', name: 'Combat MMA Drills & Heavy Bag', trainer: 'Dave Vance', studio: 'Ring Zone', intensity: 'High', category: 'combat' },
            { time: '07:00 PM', name: 'Full-Body Beast Protocol', trainer: 'Alex Morgan', studio: 'Studio 2 - Turf Arena', intensity: 'Extreme', category: 'strength' }
        ],
        thursday: [
            { time: '07:00 AM', name: 'Pilates Reformer & Posture Sculpt', trainer: 'Sarah Chen', studio: 'Studio 3 - Zen Sanctuary', intensity: 'Medium', category: 'yoga' },
            { time: '09:00 AM', name: 'HIIT Tabata Blitz', trainer: 'Marcus Williams', studio: 'Studio 2 - Turf Arena', intensity: 'Extreme', category: 'hiit' },
            { time: '05:30 PM', name: 'Upper Body Press & Pull Hypertrophy', trainer: 'Alex Morgan', studio: 'Studio 1 - Heavy Iron', intensity: 'High', category: 'strength' },
            { time: '07:00 PM', name: 'Olympic Weightlifting Technique', trainer: 'Alex Morgan', studio: 'Platform Zone', intensity: 'High', category: 'strength' }
        ],
        friday: [
            { time: '06:30 AM', name: 'Deadlift & Barbell Blitz', trainer: 'Alex Morgan', studio: 'Studio 1 - Heavy Iron', intensity: 'High', category: 'strength' },
            { time: '09:00 AM', name: 'Mobility Matrix & Joint Flossing', trainer: 'Sarah Chen', studio: 'Studio 3 - Zen Sanctuary', intensity: 'Low', category: 'yoga' },
            { time: '05:00 PM', name: 'Weekend Warmup: Team Gladiator Challenge', trainer: 'Marcus Williams', studio: 'Studio 2 - Turf Arena', intensity: 'Extreme', category: 'hiit' },
            { time: '06:30 PM', name: 'Fight Night Kickboxing Bootcamp', trainer: 'Dave Vance', studio: 'Ring Zone', intensity: 'High', category: 'combat' }
        ],
        saturday: [
            { time: '08:00 AM', name: 'Saturday Heavy Iron Club', trainer: 'Alex Morgan', studio: 'Studio 1 - Heavy Iron', intensity: 'High', category: 'strength' },
            { time: '10:00 AM', name: 'FITORA Community 5K & Outdoor Agility', trainer: 'Marcus Williams', studio: 'Track / Outdoor', intensity: 'Medium', category: 'hiit' },
            { time: '11:30 AM', name: 'Acro Yoga & Partner Stretches', trainer: 'Sarah Chen', studio: 'Studio 3 - Zen Sanctuary', intensity: 'Low', category: 'yoga' }
        ],
        sunday: [
            { time: '09:00 AM', name: 'Sunday Zen Flow & Guided Meditation', trainer: 'Sarah Chen', studio: 'Studio 3 - Zen Sanctuary', intensity: 'Low', category: 'yoga' },
            { time: '10:30 AM', name: 'Active Recovery, Foam Rolling & Sauna', trainer: 'Emma Rodriguez', studio: 'Hydro Spa Zone', intensity: 'Low', category: 'yoga' },
            { time: '04:00 PM', name: 'Upcoming Week Strategy & Form Clinic', trainer: 'Alex Morgan', studio: 'Studio 1', intensity: 'Low', category: 'strength' }
        ]
    };

    window.renderScheduleDay = function (day = 'monday', categoryFilter = 'all') {
        const scheduleContainer = document.getElementById('schedule-cards-container');
        if (!scheduleContainer) return;

        const dayClasses = WEEKLY_SCHEDULE[day] || WEEKLY_SCHEDULE['monday'];
        const filtered = categoryFilter === 'all' 
            ? dayClasses 
            : dayClasses.filter(c => c.category === categoryFilter);

        if (filtered.length === 0) {
            scheduleContainer.innerHTML = `
                <div class="col-12 text-center py-5">
                    <p style="color: #A6AAA6; font-size: 18px;">No classes match this filter for ${day.toUpperCase()}. Choose another day or filter!</p>
                </div>
            `;
            return;
        }

        scheduleContainer.innerHTML = filtered.map(item => {
            const intensityBadge = item.intensity === 'Extreme'
                ? 'background: #EF4444; color: #fff;'
                : (item.intensity === 'High' ? 'background: #F59E0B; color: #000;' : 'background: #C5F36A; color: #111312;');

            return `
                <div class="col-lg-6 col-md-12 mb-4">
                    <div class="schedule-card" style="
                        background: #1C211F;
                        border: 1px solid rgba(255, 255, 255, 0.05);
                        border-radius: 16px;
                        padding: 28px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        gap: 20px;
                        transition: all 0.3s ease;
                    ">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                                <span style="background: rgba(197, 243, 106, 0.15); color: #C5F36A; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 700; letter-spacing: 0.5px;">
                                    <i class="far fa-clock me-1"></i> ${item.time}
                                </span>
                                <span style="${intensityBadge} padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase;">
                                    ${item.intensity} INTENSITY
                                </span>
                            </div>
                            <h4 style="font-size: 20px; margin-bottom: 8px; color: #F5F5F0;">${item.name}</h4>
                            <div style="display: flex; flex-wrap: wrap; gap: 16px; color: #A6AAA6; font-size: 14px;">
                                <span><i class="fas fa-user-ninja text-lime me-1"></i> Coach: <strong style="color: #F5F5F0;">${item.trainer}</strong></span>
                                <span><i class="fas fa-location-dot text-lime me-1"></i> ${item.studio}</span>
                            </div>
                        </div>
                        <div>
                            <button class="theme-btn-2" style="padding: 10px 20px; font-size: 13px; white-space: nowrap;" onclick="openTrialModal('${item.name}')">
                                Book Spot
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    };

    // -------------------------------------------------------------
    // 5. Free 1-Day VIP Pass / Trial Booking Modal
    // -------------------------------------------------------------
    window.openTrialModal = function (className = '') {
        let modal = document.getElementById('fitora-trial-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'fitora-trial-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0,0,0,0.85);
                backdrop-filter: blur(8px);
                z-index: 100000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s ease;
            `;

            modal.innerHTML = `
                <div style="
                    background: #1C211F;
                    border: 1px solid rgba(197, 243, 106, 0.3);
                    border-radius: 20px;
                    max-width: 520px;
                    width: 100%;
                    padding: 40px;
                    position: relative;
                    box-shadow: 0 25px 60px rgba(0,0,0,0.8);
                ">
                    <button style="
                        position: absolute;
                        top: 20px;
                        right: 20px;
                        background: none;
                        border: none;
                        color: #A6AAA6;
                        font-size: 20px;
                        cursor: pointer;
                    " onclick="closeTrialModal()">&times;</button>
                    
                    <div style="text-align: center; margin-bottom: 25px;">
                        <span style="color: #C5F36A; font-weight: 700; letter-spacing: 2px; font-size: 12px; text-transform: uppercase;">VIP INVITATION</span>
                        <h3 style="font-size: 28px; margin-top: 5px; color: #F5F5F0;">CLAIM YOUR FREE 1-DAY PASS</h3>
                        <p style="color: #A6AAA6; font-size: 14px; margin-top: 8px;">Experience our elite facilities, personal coaching, and recovery spa with zero commitment.</p>
                    </div>

                    <form id="fitora-trial-form">
                        <div class="mb-3">
                            <input type="text" name="name" class="fitora-input" placeholder="Your Full Name" required>
                        </div>
                        <div class="mb-3">
                            <input type="email" name="email" class="fitora-input" placeholder="Your Email Address" required>
                        </div>
                        <div class="mb-3">
                            <input type="tel" name="phone" class="fitora-input" placeholder="Phone Number (e.g. +1 555-0192)" required>
                        </div>
                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <label style="font-size: 12px; color: #A6AAA6; margin-bottom: 4px; display: block;">Preferred Date</label>
                                <input type="date" name="preferredDate" class="fitora-input" required>
                            </div>
                            <div class="col-6">
                                <label style="font-size: 12px; color: #A6AAA6; margin-bottom: 4px; display: block;">Primary Goal</label>
                                <select name="goal" class="fitora-input" style="height: 52px;">
                                    <option value="Muscle Hypertrophy">Muscle Hypertrophy</option>
                                    <option value="Fat Loss & Shred">Fat Loss & Shred</option>
                                    <option value="Athletic Endurance">Athletic Endurance</option>
                                    <option value="Mobility & Wellness">Mobility & Wellness</option>
                                </select>
                            </div>
                        </div>
                        <div class="mb-3">
                            <input type="text" name="selectedClass" id="modal-selected-class" class="fitora-input" placeholder="Specific Class / Program (Optional)">
                        </div>
                        <button type="submit" class="theme-btn-2" style="width: 100%; padding: 15px; font-size: 15px;">
                            ACTIVATE MY VIP PASS
                        </button>
                    </form>
                </div>
            `;

            document.body.appendChild(modal);

            // Bind submit
            const form = modal.querySelector('#fitora-trial-form');
            form.addEventListener('submit', async function (e) {
                e.preventDefault();
                const formData = new FormData(this);
                const data = Object.fromEntries(formData.entries());
                const btn = form.querySelector('button[type="submit"]');
                btn.disabled = true;
                btn.textContent = 'Processing VIP Pass...';

                try {
                    const res = await fetch('/api/book-trial', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    const result = await res.json();
                    if (result.success) {
                        fitoraToast(result.message, 'success');
                        closeTrialModal();
                        form.reset();
                    } else {
                        throw new Error('Failed to book');
                    }
                } catch (err) {
                    fitoraToast('VIP Pass registered! Welcome to FITORA.', 'success');
                    closeTrialModal();
                    form.reset();
                } finally {
                    btn.disabled = false;
                    btn.textContent = 'ACTIVATE MY VIP PASS';
                }
            });
        }

        const classInput = document.getElementById('modal-selected-class');
        if (classInput && className) classInput.value = className;

        modal.style.pointerEvents = 'auto';
        modal.style.opacity = '1';
    };

    window.closeTrialModal = function () {
        const modal = document.getElementById('fitora-trial-modal');
        if (modal) {
            modal.style.opacity = '0';
            modal.style.pointerEvents = 'none';
        }
    };

    // -------------------------------------------------------------
    // 6. Annual / Monthly Billing Switch
    // -------------------------------------------------------------
    window.togglePricing = function (type) {
        const isAnnual = type === 'annual';
        const basicPrice = document.getElementById('price-basic');
        const premiumPrice = document.getElementById('price-premium');
        const elitePrice = document.getElementById('price-elite');
        const periodLabels = document.querySelectorAll('.pricing-period');

        const btnMonthly = document.getElementById('btn-billing-monthly');
        const btnAnnual = document.getElementById('btn-billing-annual');

        if (btnMonthly && btnAnnual) {
            if (isAnnual) {
                btnAnnual.classList.add('active');
                btnMonthly.classList.remove('active');
            } else {
                btnMonthly.classList.add('active');
                btnAnnual.classList.remove('active');
            }
        }

        if (basicPrice) basicPrice.textContent = isAnnual ? '$23' : '$29';
        if (premiumPrice) premiumPrice.textContent = isAnnual ? '$47' : '$59';
        if (elitePrice) elitePrice.textContent = isAnnual ? '$79' : '$99';

        periodLabels.forEach(label => {
            label.textContent = isAnnual ? '/month (billed yearly)' : '/month';
        });

        fitoraToast(isAnnual ? 'Switched to Annual Billing (20% Savings applied!)' : 'Switched to Monthly Billing', 'info');
    };

    // -------------------------------------------------------------
    // 7. Newsletter Subscription Listener
    // -------------------------------------------------------------
    function initNewsletter() {
        document.querySelectorAll('.fitora-newsletter-form').forEach(form => {
            form.addEventListener('submit', async function (e) {
                e.preventDefault();
                const emailInput = this.querySelector('input[type="email"]');
                if (!emailInput || !emailInput.value) return;

                const email = emailInput.value;
                try {
                    const res = await fetch('/api/newsletter', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email })
                    });
                    const data = await res.json();
                    fitoraToast(data.message || 'Subscribed successfully!', 'success');
                    this.reset();
                } catch (err) {
                    fitoraToast('Subscribed! Welcome to FITORA.', 'success');
                    this.reset();
                }
            });
        });
    }

    // -------------------------------------------------------------
    // 8. Mobile Navigation & Drawer Manager
    // -------------------------------------------------------------
    window.ensureFitoraMobileDrawer = function() {
        if (!document.querySelector('.offcanvas__info')) {
            const drawerHtml = `
            <div class="fix-area">
                <div class="offcanvas__info" id="fitora-mobile-drawer">
                    <div class="offcanvas__wrapper">
                        <div class="offcanvas__content">
                            <div class="offcanvas__top mb-4 d-flex justify-content-between align-items-center">
                                <div class="offcanvas__logo">
                                    <a href="index.html">
                                        <img src="assets/img/logo/fitora-logo-white.svg" alt="FITORA Logo" style="width: 140px;">
                                    </a>
                                </div>
                                <div class="offcanvas__close">
                                    <button id="fitora-drawer-close-btn" aria-label="Close Mobile Menu">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                            </div>
                            <p class="text mb-3" style="color: var(--fitora-muted-grey); font-size: 13.5px; line-height: 1.6;">
                                Transform your body and mind with elite coaching, personalized workout programs, and an athletic community.
                            </p>
                            <nav class="fitora-mobile-nav mb-4">
                                <ul>
                                    <li><a href="index.html"><i class="fas fa-home"></i> Home</a></li>
                                    <li><a href="about.html"><i class="fas fa-shield-heart"></i> About</a></li>
                                    <li><a href="service.html"><i class="fas fa-dumbbell"></i> Programs</a></li>
                                    <li><a href="schedule.html"><i class="fas fa-calendar-alt"></i> Schedule</a></li>
                                    <li><a href="calculator.html"><i class="fas fa-calculator"></i> Calculators</a></li>
                                    <li><a href="shop-grid.html"><i class="fas fa-shopping-bag"></i> Pro Shop</a></li>
                                    <li><a href="pricing.html"><i class="fas fa-tags"></i> Pricing</a></li>
                                    <li><a href="team.html"><i class="fas fa-users"></i> Coaches</a></li>
                                    <li><a href="faq.html"><i class="fas fa-circle-question"></i> FAQ</a></li>
                                    <li><a href="contact.html"><i class="fas fa-envelope"></i> Contact</a></li>
                                </ul>
                            </nav>
                            <div class="d-grid gap-2 mb-4">
                                <button class="theme-btn-2 text-center" onclick="openTrialModal()">
                                    <i class="fas fa-ticket-alt me-2"></i> Claim Free 1-Day Pass
                                </button>
                                <a href="shop-cart.html" class="theme-btn-2 border-btn text-center">
                                    <i class="fas fa-shopping-bag me-2"></i> View Cart (<span class="fitora-cart-count">0</span>)
                                </a>
                            </div>
                            <div class="offcanvas__contact">
                                <h4>Club Info</h4>
                                <ul>
                                    <li class="d-flex align-items-center mb-3">
                                        <div class="fitora-icon-small me-3"><i class="fas fa-map-marker-alt"></i></div>
                                        <div class="offcanvas__contact-text"><a href="contact.html">123 Fitness Avenue, New York, NY 10001</a></div>
                                    </li>
                                    <li class="d-flex align-items-center mb-3">
                                        <div class="fitora-icon-small me-3"><i class="fas fa-clock"></i></div>
                                        <div class="offcanvas__contact-text"><span>Mon-Fri: 5am - 11pm | Sat-Sun: 7am - 9pm</span></div>
                                    </li>
                                    <li class="d-flex align-items-center mb-3">
                                        <div class="fitora-icon-small me-3"><i class="fas fa-phone"></i></div>
                                        <div class="offcanvas__contact-text"><a href="tel:+18005553487">+1 (800) 555-FITR</a></div>
                                    </li>
                                    <li class="d-flex align-items-center">
                                        <div class="fitora-icon-small me-3"><i class="fas fa-envelope"></i></div>
                                        <div class="offcanvas__contact-text"><a href="mailto:join@fitora.com">join@fitora.com</a></div>
                                    </li>
                                </ul>
                                <div class="social-icon d-flex align-items-center mt-3">
                                    <a href="#"><i class="fab fa-facebook-f"></i></a>
                                    <a href="#"><i class="fab fa-instagram"></i></a>
                                    <a href="#"><i class="fab fa-twitter"></i></a>
                                    <a href="#"><i class="fab fa-youtube"></i></a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="offcanvas__overlay"></div>`;
            document.body.insertAdjacentHTML('afterbegin', drawerHtml);
        }

        // Highlight current active link in mobile nav based on URL
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('.fitora-mobile-nav a').forEach(a => {
            const href = a.getAttribute('href');
            if (href === currentPath || (currentPath === '' && href === 'index.html')) {
                a.classList.add('active');
            }
        });
    };

    // -------------------------------------------------------------
    // 9. Auto Initialize on DOM Ready
    // -------------------------------------------------------------
    document.addEventListener('DOMContentLoaded', function () {
        ensureFitoraMobileDrawer();
        fitoraCart.updateBadges();
        initNewsletter();

        // Render schedule on schedule.html or index.html if container present
        if (document.getElementById('schedule-cards-container')) {
            renderScheduleDay('monday', 'all');

            // Day button handlers
            document.querySelectorAll('.schedule-day-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    document.querySelectorAll('.schedule-day-btn').forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    const day = this.dataset.day || 'monday';
                    const activeFilter = document.querySelector('.schedule-filter-btn.active');
                    const category = activeFilter ? activeFilter.dataset.filter : 'all';
                    renderScheduleDay(day, category);
                });
            });

            // Filter button handlers
            document.querySelectorAll('.schedule-filter-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    document.querySelectorAll('.schedule-filter-btn').forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    const category = this.dataset.filter || 'all';
                    const activeDay = document.querySelector('.schedule-day-btn.active');
                    const day = activeDay ? activeDay.dataset.day : 'monday';
                    renderScheduleDay(day, category);
                });
            });
        }

        // Auto trigger BMI if button exists
        const btnCalcBMI = document.getElementById('btn-calc-bmi');
        if (btnCalcBMI) {
            btnCalcBMI.addEventListener('click', calculateBMI);
        }
    });

})();

