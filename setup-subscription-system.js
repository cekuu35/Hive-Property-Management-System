// Setup Subscription System - Quick Start Script
// This script helps you set up the subscription system quickly

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// IMPORTANT: Replace these with your actual Supabase credentials
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kozhlejudselgtmohdfm.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR-SERVICE-ROLE-KEY-HERE';

// Your email to make admin
const ADMIN_EMAIL = 'YOUR-EMAIL@example.com'; // CHANGE THIS!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function setup() {
  console.log('🚀 Starting Subscription System Setup...\n');

  try {
    // Step 1: Check if tables exist
    console.log('📋 Step 1: Checking if tables exist...');
    const { data: tables, error: tablesError } = await supabase
      .from('subscription_plans')
      .select('count')
      .limit(1);

    if (tablesError) {
      console.log('⚠️  Tables not found. Please run the migration first!');
      console.log('\n📝 To apply the migration:');
      console.log('   1. Go to Supabase Dashboard');
      console.log('   2. Open SQL Editor');
      console.log('   3. Copy content from: supabase/migrations/20251026000010_subscription_system.sql');
      console.log('   4. Paste and run in SQL Editor\n');
      return;
    }

    console.log('✅ Tables exist!\n');

    // Step 2: Check default plans
    console.log('📋 Step 2: Checking default plans...');
    const { data: plans, error: plansError } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('sort_order');

    if (plansError) {
      console.error('❌ Error fetching plans:', plansError);
      return;
    }

    console.log(`✅ Found ${plans.length} plans:`);
    plans.forEach(plan => {
      console.log(`   - ${plan.display_name}: KES ${plan.price}/month`);
      console.log(`     Limits: ${plan.limits.max_properties || 0} properties, ${plan.limits.max_units || 0} units`);
    });
    console.log('');

    // Step 3: Make user admin
    if (ADMIN_EMAIL === 'YOUR-EMAIL@example.com') {
      console.log('⚠️  Please update ADMIN_EMAIL in this script with your actual email!');
      console.log('   Open setup-subscription-system.js and change line 11\n');
      return;
    }

    console.log(`📋 Step 3: Making ${ADMIN_EMAIL} an admin...`);
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', ADMIN_EMAIL)
      .single();

    if (profileError || !profile) {
      console.log(`❌ User not found with email: ${ADMIN_EMAIL}`);
      console.log('   Make sure the email is correct and the user exists\n');
      return;
    }

    // Update to admin
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_admin: true })
      .eq('id', profile.id);

    if (updateError) {
      console.error('❌ Error making user admin:', updateError);
      return;
    }

    console.log(`✅ ${profile.first_name} ${profile.last_name} is now an admin!\n');

    // Step 4: Create trial subscription for admin (optional)
    console.log('📋 Step 4: Checking if admin has a subscription...');
    
    const { data: existingSub, error: subCheckError } = await supabase
      .from('landlord_subscriptions')
      .select('*')
      .eq('landlord_id', profile.id)
      .single();

    if (existingSub) {
      console.log('✅ Admin already has a subscription\n');
    } else {
      console.log('   Creating trial subscription for admin...');
      
      const freePlan = plans.find(p => p.name === 'free');
      
      if (!freePlan) {
        console.log('⚠️  Free trial plan not found');
      } else {
        const trialDays = freePlan.trial_days || 14;
        const { error: createSubError } = await supabase
          .from('landlord_subscriptions')
          .insert({
            landlord_id: profile.id,
            plan_id: freePlan.id,
            status: 'trial',
            trial_start_date: new Date().toISOString(),
            trial_end_date: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString(),
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString()
          });

        if (createSubError) {
          console.log('⚠️  Could not create trial subscription:', createSubError.message);
        } else {
          console.log(`✅ Trial subscription created (${trialDays} days)\n`);
        }
      }
    }

    // Step 5: Summary
    console.log('🎉 Setup Complete!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SUBSCRIPTION SYSTEM STATUS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Database: Ready`);
    console.log(`✅ Plans: ${plans.length} configured`);
    console.log(`✅ Admin: ${profile.first_name} ${profile.last_name}`);
    console.log(`✅ Admin Email: ${ADMIN_EMAIL}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 AVAILABLE PLANS:');
    plans.forEach(plan => {
      console.log(`\n${plan.display_name}`);
      console.log(`   Price: KES ${plan.price.toLocaleString()}/month`);
      console.log(`   Trial: ${plan.trial_days} days`);
      console.log(`   Limits:`);
      console.log(`     - Properties: ${plan.limits.max_properties === -1 ? 'Unlimited' : plan.limits.max_properties}`);
      console.log(`     - Units: ${plan.limits.max_units === -1 ? 'Unlimited' : plan.limits.max_units}`);
      console.log(`     - Tenants: ${plan.limits.max_tenants === -1 ? 'Unlimited' : plan.limits.max_tenants}`);
    });

    console.log('\n\n🚀 NEXT STEPS:');
    console.log('   1. ✅ Database setup complete!');
    console.log('   2. ✅ You are now an admin');
    console.log('   3. 📖 Read: SUBSCRIPTION_SETUP_GUIDE.md');
    console.log('   4. 🔨 Phase 2: Build Admin Portal UI');
    console.log('   5. 🔨 Phase 3: Build Subscription Hooks & Feature Gating');
    console.log('   6. 💳 Phase 4: Integrate M-Pesa Subscription Payments');
    console.log('\n✨ Phase 1 (Database) Complete!\n');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    console.log('\n🆘 Troubleshooting:');
    console.log('   1. Make sure SUPABASE_SERVICE_ROLE_KEY is set correctly');
    console.log('   2. Make sure the migration has been applied');
    console.log('   3. Check your internet connection');
    console.log('   4. Verify your Supabase project is active\n');
  }
}

// Run setup
setup();

