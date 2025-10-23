/**
 * Generate VAPID Keys for Web Push Notifications
 * Run: node generate-vapid-keys.js
 */

import webpush from 'web-push';

console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
console.log('║              🔑 VAPID KEYS GENERATOR 🔑                           ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('📝 COPY THESE VAPID KEYS:\n');
console.log('─'.repeat(70));
console.log('\nPublic Key:');
console.log(vapidKeys.publicKey);
console.log('\nPrivate Key:');
console.log(vapidKeys.privateKey);
console.log('\n' + '─'.repeat(70));

console.log('\n⚠️  IMPORTANT SECURITY NOTES:\n');
console.log('   ✅ Public Key  → Safe to use in frontend code');
console.log('   ❌ Private Key → NEVER expose! Keep secret!\n');

console.log('📋 NEXT STEPS:\n');
console.log('   1. Go to Supabase Dashboard → Edge Functions → Secrets');
console.log('   2. Add these 3 secrets:\n');
console.log('      VAPID_PUBLIC_KEY  = <public-key-above>');
console.log('      VAPID_PRIVATE_KEY = <private-key-above>');
console.log('      VAPID_SUBJECT     = mailto:your-email@example.com\n');
console.log('   3. Update vite.config.ts with public key');
console.log('   4. Deploy Edge Function\n');

console.log('═══════════════════════════════════════════════════════════════════\n');

