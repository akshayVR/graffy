import React, { useState } from 'react';
import { useQuery } from '@graffy/react';

import VisitorList from './VisitorList';
import Pagination from './Pagination';
import Spinner from './Spinner';
// import Query from './Query';

const PAGE_SIZE = 12;

function getQuery(range) {
  return {
    visitors: {
      _key_: { order: ['ts'], ...range },
      id: true,
      ts: true,
      name: true,
      avatar: true,
      pageviews: { _key_: { last: 3 } },
    },
  };
}

export default function Example() {
  const [range, setRange] = useState({ first: PAGE_SIZE });
  const q = getQuery(range);
  const { data, loading } = useQuery(q);

  console.log('data', data, loading);

  if (!data || !data.visitors) {
    // We are still performing the initial load
    return <Spinner />;
  }

  // Extract page info, this is used in several places
  let { start, end, hasNext, hasPrev } = data.visitors.pageInfo;

  const visitors = data.visitors;

  if (!loading && !hasPrev && hasNext && range.last) {
    // We have reached the beginning of the list while paginating backwards.
    // Flip the query to the first N.
    setRange({ first: PAGE_SIZE });
    return <Spinner />;
  }

  return (
    <div className="Example">
      {/*<Query
        query={q}
        onChange={(value) => {
          console.log(value);
        }}
      />*/}
      <Pagination
        onPrev={hasPrev && (() => setRange({ last: PAGE_SIZE, before: start }))}
        range={range}
        count={visitors.length}
        onNext={hasNext && (() => setRange({ first: PAGE_SIZE, after: end }))}
      />
      <VisitorList visitors={visitors} />
      {loading && <Spinner />}
      <style jsx>{`
        .Example {
          text-align: left;
          width: 100%;
          line-height: 1em;
        }
      `}</style>
    </div>
  );
}
