import Graffy from '@graffy/core';
import Memory from './index.js';

describe('final', () => {
  let store;

  beforeEach(() => {
    store = new Graffy();
    store.use(Memory());
    store.onRead(() => {
      throw Error();
    });
    store.write({ foo: 42 });
  });

  test('simple', async () => {
    const result = await store.read({ foo: 1, bar: 1 });
    expect(result).toEqual({ foo: 42, bar: null });
  });

  test('watch', async () => {
    const result = store.watch({ foo: 1 });
    expect((await result.next()).value).toEqual(undefined);
    store.write({ foo: 44 });
    expect((await result.next()).value).toEqual({ foo: 44 });
  });

  test('range', async () => {
    store.write({ baz: [{ $key: ['a'], $ref: 'foo' }] });
    const result = await store.read('baz', [{ $key: { $first: 3 } }]);
    const expectedResult = [42];
    expect(result).toEqual(expectedResult);
  });
});
