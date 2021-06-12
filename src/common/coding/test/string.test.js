import { encode, decode } from '../string.js';

function tryString(str) {
  const enc = encode(str);
  const dec = decode(enc);
  expect(dec).toEqual(str);
}

test('string', () => {
  tryString('');
  tryString('Hello');
});
