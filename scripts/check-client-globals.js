const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'public/src/main.js'), 'utf8');

if (/\bclamp\s*\(/.test(source)) {
  throw new Error('public/src/main.js references clamp(...). Use clampNumber(...) in browser code.');
}

const unsafeEllipseLine = source.split(/\r?\n/).find((line) => {
  return line.includes('fillEllipse(') && line.includes('Math.PI');
});
if (unsafeEllipseLine) {
  throw new Error('public/src/main.js passes Math.PI to fillEllipse(...). The fifth argument is smoothness, not rotation.');
}

const drawEffectsStart = source.indexOf('  drawEffects() {');
const drawEffectsEnd = source.indexOf('  drawKingReturnEffect(', drawEffectsStart);
const drawEffectsSource = drawEffectsStart >= 0 && drawEffectsEnd > drawEffectsStart
  ? source.slice(drawEffectsStart, drawEffectsEnd)
  : '';
if (!drawEffectsSource.includes('const duration = this.effectDuration(effect.type);')) {
  throw new Error('drawEffects must define duration before using effect timing math.');
}

console.log('client globals ok');
