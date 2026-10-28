const { randomInt } = require('node:crypto');
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const CHARS = `${UPPER}abcdefghijkmnpqrstuvwxyz${DIGITS}`;

function temporaryPassword() {
  const chars = [UPPER[randomInt(UPPER.length)], DIGITS[randomInt(DIGITS.length)],
    ...Array.from({ length: 10 }, () => CHARS[randomInt(CHARS.length)])];
  for (let index = chars.length - 1; index > 0; index--) {
    const other = randomInt(index + 1);
    [chars[index], chars[other]] = [chars[other], chars[index]];
  }
  return chars.join('');
}
module.exports = { temporaryPassword };
