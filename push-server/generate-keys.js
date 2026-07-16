// Run once:  npm run generate-keys
// Copy the output into your api/.env file.
const webpush = require('web-push');
const { publicKey, privateKey } = webpush.generateVAPIDKeys();

console.log('\nCopy these into api/.env:\n');
console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
console.log('\nKeep VAPID_PRIVATE_KEY secret — never commit it to git.\n');
