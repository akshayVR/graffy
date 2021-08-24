import { loadSchema } from './pool.js';
function setOnce(slotName, acc, prop, name) {
  if (acc[prop]) {
    throw Error(
      `pg.options.duplicate: Both ${acc[prop]} and ${name} map to ${slotName}`,
    );
  }
  acc[prop] = name;
}

function pushValue(acc, prop, value) {
  acc[prop] = acc[prop] || [];
  acc[prop].push(value);
}

/*
  Normalizes options and adds idCol, defCol, verCol, props and args
  args: { <argname>: { role: 'gin' | 'tsv' | 'trgm', name: <columnName> } }
  props: { <propname>: { ['data'|'gin'|'tsv'|'trgm']: <columnName> } }
*/

const defaults = {
  id: { role: 'primary' },
  data: { role: 'default', updater: '||' },
  version: { role: 'version' },
};

export default async function (prefix, { table, columns = defaults, ...rest }) {
  table = table || prefix[prefix.length - 1] || 'default';
  console.log(table);
  let schema = await loadSchema(table);
  if (schema && columns)
    Object.entries(schema.columns).forEach(([colName]) => {
      if (columns[colName]) schema.columns[colName] = columns[colName];
    });
  const columnOptions = Object.entries(schema.columns).reduce(
    (acc, [name, { role, prop, props, arg, updater }]) => {
      if (role === 'primary') {
        prop = prop || name;
        setOnce(`${table} idCol`, acc, 'idCol', name);
        setOnce(`${table} idProp`, acc, 'idProp', prop);
        setOnce(`${table} idArg`, acc.args, prop, { role, name });
        acc.props[prop] = acc.props[prop] || {};
        setOnce(`${table}/${prop}:${role}`, acc.props[prop], 'data', name);
        acc.columns[name] = { role, prop };
      }
      if (role === 'default') setOnce(`${table} default`, acc, 'defCol', name);
      if (role === 'version') setOnce(`${table} version`, acc, 'verCol', name);

      if (role === 'simple') {
        prop = prop || name;
        acc.props[prop] = acc.props[prop] || {};
        setOnce(`${table}/${prop}:${role}`, acc.props[prop], 'data', name);
        setOnce(`${table}/${prop}:${role}`, acc.args, prop, { role, name });
        acc.columns[name] = { role, prop };
      }

      if (role === 'gin' || role === 'trgm' || role === 'tsv') {
        arg = arg || name;
        props = props || [];
        for (const iProp of props) {
          acc.props[iProp] = acc.props[iProp] || {};
          pushValue(acc.props[iProp], role, name);
          if (role === 'gin') {
            setOnce(`${table} arg ${iProp}`, acc.args, iProp, { role, name });
          }
        }
        if (role !== 'gin') {
          setOnce(`${table} arg ${arg}`, acc.args, arg, { role, name });
        }
      }

      if (updater) acc.updaters[name] = updater;

      return acc;
    },
    { columns: {}, props: {}, args: {}, updaters: {} },
  );
  if (!columnOptions.idCol) throw Error(`pg.no_primary_column: ${table}`);
  if (!columnOptions.verCol) throw Error(`pg.no_version_column: ${table}`);
  if (!columnOptions.links) columnOptions.links = {};

  return { ...rest, prefix, table, ...columnOptions };
}
