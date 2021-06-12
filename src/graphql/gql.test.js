import gql from './gql.js';

test.skip('toQuery', () => {
  const userId = 123;
  expect(
    gql`
      {
        foo: user(id: ${userId}) {
          id
          name
          isViewerFriend
          profilePicture(size: 50) {
            ...PictureFragment
          }
        }
      }

      fragment PictureFragment on Picture {
        uri
        width
        height
      }
    `,
  ).toEqual([
    // prettier-ignore
    { key: 'user', version: 3, children: [
      { key: '123', alias: 'foo', version: 3, children: [
        { key: 'id', version: 3, num: 1 },
        { key: 'name', version: 3, num: 1 },
        { key: 'isViewerFriend', version: 3, num: 1 },
        { key: 'profilePicture', version: 3, children: [
          { key: '"50"', version: 3, children: [
            { key: 'uri', version: 3, num: 1 },
            { key: 'width', version: 3, num: 1 },
            { key: 'height', version: 3, num: 1 },
          ] },
        ] },
      ] },
    ] },
  ]);
});
