import { selectByArgs, selectByIds } from './sql/index.js';
import { linkResult } from './link/index.js';
import { pgPool } from './pool.js';
import {
  isPlainObject,
  decodeArgs,
  add,
  isEmpty,
  wrap,
  unwrap,
  finalize,
  merge,
  wrapObject,
  slice,
  encodeGraph,
} from '@graffy/common';
import { format } from '@graffy/testing';
import debug from 'debug';
const log = debug('graffy:pg:dbRead');

export default async function dbRead(rootQuery, pgOptions, store) {
  const idQueries = {};
  const refQuery = [];
  const promises = [];
  const results = [];

  async function getByArgs(args, subQuery) {
    const result = await readSql(selectByArgs(args, pgOptions), pgPool);
    add(refQuery, linkResult(result, subQuery, pgOptions));

    const wrappedQuery = wrap(subQuery, [...pgOptions.prefix, args]);
    const wrappedGraph = encodeGraph(wrapObject(result, pgOptions.prefix));

    log(
      'getByArgs',
      format(wrappedGraph),
      format(wrappedQuery),
      format(finalize(wrappedGraph, wrappedQuery)),
    );

    merge(results, finalize(wrappedGraph, wrappedQuery));
  }

  async function getByIds() {
    const result = await readSql(
      selectByIds(Object.keys(idQueries), pgOptions),
      pgPool,
    );

    result.forEach((object) => {
      const id = object[pgOptions.idProp];
      const subQuery = idQueries[id];
      add(refQuery, linkResult([object], subQuery, pgOptions));

      const wrappedQuery = wrap(subQuery, [...pgOptions.prefix, id]);
      const wrappedGraph = encodeGraph(wrapObject(object, pgOptions.prefix));

      log(
        'getByIds',
        format(wrappedGraph),
        format(wrappedQuery),
        format(finalize(wrappedGraph, wrappedQuery)),
      );

      merge(results, finalize(wrappedGraph, wrappedQuery));
    });
    console.log(result);
  }

  const query = unwrap(rootQuery, store.path);

  for (const node of query) {
    const args = decodeArgs(node);

    if (isPlainObject(args)) {
      promises.push(getByArgs(args, node.children));
    } else {
      idQueries[node.key] = node.children;
    }
  }
  console.log(idQueries);
  if (!isEmpty(idQueries)) promises.push(getByIds());
  await Promise.all(promises);

  if (refQuery.length) {
    log('refQuery', format(refQuery));
    merge(results, await store.call('read', refQuery));
  }

  log('dbRead', format(rootQuery), format(results));
  return slice(results, rootQuery).known || [];
}

async function readSql(sqlQuery, client) {
  log(sqlQuery.text);
  log(sqlQuery.values);

  sqlQuery.rowMode = 'array';
  const result = (await client.query(sqlQuery)).rows.flat();
  // Each row is an array, as there is only one column returned.
  log('ReadSQL', result);
  return result;
}
