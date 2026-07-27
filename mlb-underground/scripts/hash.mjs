import crypto from 'crypto';

// Mirrors the PHP hash_password(): sha1('salty-salt' . sha1($password)).
// Use this to generate the "password" value for a user in config.json:
//   npm run hash -- yourPasswordHere
const sha1 = (value) => crypto.createHash('sha1').update(value).digest('hex');
const hashPassword = (password) => sha1('salty-salt' + sha1(password));

const password = process.argv[2];
if (!password) {
  console.error('Usage: npm run hash -- <password>');
  process.exit(1);
}

console.log(hashPassword(password));
