import {
  wrap,
  unwrap,
  remove,
  merge,
  mergeStreams,
  encodePath,
  encodeQuery,
  encodeGraph,
  decodeQuery,
  decodeGraph,
  unwrapObject,
  wrapObject,
  finalize,
} from '@graffy/common';
import { makeStream } from '@graffy/stream';

async function mapStream(stream, fn) {
  for await (const value of stream) {
    fn(value);
  }
}

export function wrapProvider(fn, decodedPath, isRead) {
  const decodePayload = isRead ? decodeQuery : decodeGraph;
  const encodePayload = isRead ? encodeQuery : encodeGraph;
  const path = encodePath(decodedPath);
  return async function wrappedProvider(payload, options, next) {
    let nextCalled = false;
    let remainingNextResult;
    const porcelainPayload = unwrapObject(decodePayload(payload), decodedPath);
    const remainingPayload = remove(payload, path) || [];

    // This next function is offered to the provider function.
    async function shiftedNext(porcelainNextPayload) {
      nextCalled = true;
      const nextPayload = encodePayload(
        wrapObject(porcelainNextPayload, decodedPath),
      );
      if (remainingPayload.length) merge(nextPayload, remainingPayload);
      const nextResult = await next(nextPayload);

      // Remember the next() results that are not returned to this provider.
      // These will be merged into the result later.
      remainingNextResult = remove(nextResult, path) || [];
      return unwrapObject(decodeGraph(nextResult), decodedPath);
    }

    const porcelainResult = await fn(porcelainPayload, options, shiftedNext);
    let result = encodeGraph(wrapObject(porcelainResult, decodedPath));
    // console.log(result);

    // TODO: Get rid of this special handling by requiring read providers to
    // finalize results themselves.
    if (isRead && !nextCalled) {
      // This does the opposite of "remove"; "keep"?
      const appliedQuery = wrap(unwrap(payload, path), path);
      result = finalize(result, appliedQuery);
      result = wrap(unwrap(result, path), path);
    }

    if (!nextCalled && remainingPayload.length) {
      remainingNextResult = await next(remainingPayload);
    }

    if (remainingNextResult?.length) {
      merge(result, remainingNextResult);
    }

    // console.log('Shifted', path, format(payload), format(result));
    return result;
  };
}

// TODO: Provider calling next in a subscription function is not tested.

export function shiftGen(fn, path) {
  path = encodePath(path);
  return async function* shiftedGen(payload, options, next) {
    let nextCalled = false;
    let remainingNextStream;
    const unwrappedPayload = unwrap(payload, path);
    const remainingPayload = remove(payload, path) || [];

    // TODO: This should probably use makeStream and propagate returns.
    const shiftedNext = async function* shiftedNextFn(unwrappedNextPayload) {
      nextCalled = true;
      const nextPayload = wrap(unwrappedNextPayload, path);
      if (remainingPayload.length) merge(nextPayload, remainingPayload);

      /** @type {Function} */
      let pushRemaining;
      remainingNextStream = makeStream((push) => {
        pushRemaining = push;
      });

      for await (const value of next(nextPayload)) {
        const unwrappedValue = unwrap(value, path);
        const remainingValue = remove(value, path);
        if (remainingValue) pushRemaining(remainingValue);
        if (unwrappedValue) yield unwrappedValue;
      }
    };

    const unwrappedStream = fn(unwrappedPayload, options, shiftedNext);

    // We expect next() to be called before the first value is yielded.
    const firstValue = await (await unwrappedStream.next()).value;
    const resultStream = makeStream((push) => {
      push(wrap(firstValue, path));
      mapStream(unwrappedStream, (value) => {
        push(wrap(value, path));
      });
      return () => unwrappedStream.return();
    });

    if (!nextCalled && remainingPayload.length) {
      remainingNextStream = next(remainingPayload);
    }

    yield* remainingNextStream
      ? mergeStreams(resultStream, remainingNextStream)
      : resultStream;
  };
}
