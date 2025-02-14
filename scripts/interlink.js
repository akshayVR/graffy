import { npm, ownPattern } from './utils.js';

export default async function link(name) {
  try {
    await Promise.all(
      Object.keys(read('dist', name, 'package.json').dependencies)
        .filter((dep) => ownPattern.test(dep))
        .map((dep) => npm(name, 'link', dep)),
    );
    console.log(`INFO [${name}] interlinked`);
  } catch (e) {
    console.error(`ERROR [${name}] interlink failed`);
    console.error(e.message);
  }
}
