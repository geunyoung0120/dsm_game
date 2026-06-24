const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'public/src/main.js'), 'utf8');

if (/\bclamp\s*\(/.test(source)) {
  throw new Error('public/src/main.js references clamp(...). Use clampNumber(...) in browser code.');
}

console.log('client globals ok');
