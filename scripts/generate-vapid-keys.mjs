// scripts/generate-vapid-keys.mjs
//
// Run once to generate your VAPID key pair:
//   node scripts/generate-vapid-keys.mjs
//
// Copy the output into your Vercel environment variables.

import webpush from 'web-push'

const keys = webpush.generateVAPIDKeys()

console.log('\n✦  VAPID Keys generated\n')
console.log('Add these to Vercel → Settings → Environment Variables:\n')
console.log('NEXT_PUBLIC_VAPID_PUBLIC_KEY=', keys.publicKey)
console.log('VAPID_PRIVATE_KEY=           ', keys.privateKey)
console.log('\nNever commit these to git. The private key must stay secret.\n')
