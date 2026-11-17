/**
 * FITORA Supabase & Platform Configuration
 * 
 * Replace the placeholders below with your Supabase credentials:
 * 1. Go to your Supabase Dashboard (https://supabase.com/dashboard)
 * 2. Select your Project -> Project Settings -> API
 * 3. Copy "Project URL" into supabaseUrl and "anon public" key into supabaseKey.
 */
window.FITORA_CONFIG = {
    // Supabase project credentials
    supabaseUrl: window.localStorage.getItem('fitora_supabase_url') || '',
    supabaseKey: window.localStorage.getItem('fitora_supabase_key') || '',
    
    // Gym brand details
    gymName: 'FITORA - Fitness & Wellness',
    currencySymbol: '$',
    notificationDays: [7, 3, 1, 0, -1], // Days relative to expiry to trigger alerts
    
    // Versioning
    version: '4.0.0'
};
