import Graffy from './Graffy';
import { LINK_KEY, PAGE_KEY } from '@graffy/common';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

describe.skip('stream', () => {
  let g;
  let timer;
  let close;

  beforeEach(() => {
    g = new Graffy();
    close = jest.fn();

    g.use('/foo', graffy => {
      graffy.onSub('/bar', (_, { token }) => {
        let i = 1;
        expect(token).toHaveProperty('signaled');
        expect(token).toHaveProperty('onSignal');
        token.onSignal(close);
        timer = setInterval(() => graffy.pub({ bar: i++ }), 10);
        return Promise.resolve({ bar: 0 });
      });
    });
  });

  afterEach(() => {
    clearTimeout(timer);
  });

  test('simple', async () => {
    const sub = g.sub({ foo: { bar: 1 } });
    let j = 0;
    for await (const val of sub) {
      expect(val).toEqual({ foo: { bar: j++ } });
      if (j === 3) break;
    }
    expect(close).toHaveBeenCalledTimes(1);
  });
});

describe('changes', () => {
  let g;

  beforeEach(() => {
    g = new Graffy();
  });

  test('object', async () => {
    g.onSub('/foo', async function*() {
      yield { foo: { a: 3 } };
      await sleep(10);
      yield { foo: { a: 4 } };
    });
    const sub = g.sub({ foo: { a: true } });

    expect((await sub.next()).value).toEqual({ foo: { a: 3 } });
    expect((await sub.next()).value).toEqual({ foo: { a: 4 } });
  });
});