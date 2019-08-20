import { graph, page, link } from '../graph';

it('should encode graphs', () => {
  expect(
    graph(
      {
        postCount: 25,
        posts: page(
          {
            '1984': {
              title: '1984',
              body: 'Lorem ipsum',
              author: link(['users', '1']),
            },
            '2001': {
              title: '2001',
              body: 'Hello world',
              author: link(['users', '2']),
            },
          },
          '1984',
        ),
      },
      2,
    ),
  ).toEqual(
    /* prettier-ignore */
    [
      { key: 'postCount', value: 25, version: 2 },
      { key: 'posts', version: 2, children: [
        { key: '1984', version: 2, children: [
          { key: 'author', version: 2, path: ['users', '1'] },
          { key: 'body', value: 'Lorem ipsum', version: 2 },
          { key: 'title', value: '1984', version: 2 },
        ] },
        { key: '1984\0', end: '2000\uffff', version: 2},
        { key: '2001', version: 2, children: [
          { key: 'author', version: 2, path: ['users', '2'] },
          { key: 'body', value: 'Hello world', version: 2 },
          { key: 'title', value: '2001', version: 2 },
        ] },
        { key: '2001\0', end: '\uffff', version: 2 }
      ] },
    ],
  );
});
