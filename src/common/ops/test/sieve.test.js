import sieve from '../sieve.js';
import { encodeGraph } from '../../coding/index.js';

test('empty', () => {
  const g = [];
  const change = sieve(g, encodeGraph({ foo: 42 }, 0));
  expect(change).toEqual([]);
  expect(g).toEqual([]);
});

test('full', () => {
  const g = [{ key: '', end: '\uffff', version: 0 }];
  const change = sieve(g, encodeGraph({ foo: 42 }, 0));
  expect(change).toEqual(encodeGraph({ foo: 42 }, 0));
  expect(g).toEqual([
    { key: '', end: 'fon\uffff', version: 0 },
    { key: 'foo', value: 42, version: 0 },
    { key: 'foo\0', end: '\uffff', version: 0 },
  ]);
});

test('full-add-branch', () => {
  const g = [{ key: '', end: '\uffff', version: 0 }];
  const change = sieve(g, encodeGraph({ foo: { bar: 42 } }, 0));
  expect(change).toEqual(encodeGraph({ foo: { bar: 42 } }, 0));
  expect(g).toEqual([
    { key: '', end: 'fon\uffff', version: 0 },
    {
      key: 'foo',
      version: 0,
      children: [
        { key: '', end: 'baq\uffff', version: 0 },
        { key: 'bar', value: 42, version: 0 },
        { key: 'bar\0', end: '\uffff', version: 0 },
      ],
    },
    { key: 'foo\0', end: '\uffff', version: 0 },
  ]);
});

test('ignore-unchanged', () => {
  const g = encodeGraph({ foo: { bar: 42 } }, 0);
  const change = sieve(g, encodeGraph({ foo: { bar: 42 } }, 1));
  expect(change).toEqual([]);
  expect(g).toEqual(encodeGraph({ foo: { bar: 42 } }, 1));
});

test('empty knowledge', () => {
  const data = [{ key: '', end: '\uffff', version: -1 }];
  const change = [
    {
      key: 'foo',
      version: 0,
      children: [{ key: '', end: '\uffff', version: 1 }],
    },
  ];
  const sieved = sieve(data, change);
  expect(data).toEqual([
    { key: '', end: 'fon\uffff', version: -1 },
    {
      key: 'foo',
      version: 0,
      children: [{ key: '', end: '\uffff', version: 1 }],
    },
    { key: 'foo\0', end: '\uffff', version: -1 },
  ]);
  expect(sieved).toEqual(change);
});
