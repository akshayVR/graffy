import { join } from 'path';
import next from 'next';
import express from 'express';
import debug from 'debug';
import { httpServer, wsServer } from '@graffy/server';
import store from './stores/public.js';

process.env.NEXTJS = 1; // Use the Next.js babel config.

const log = debug('graffy:website:server');
const dev = process.env.NODE_ENV !== 'production';
const dir = join(import.meta.url.substr(5), '../../..');
const nextApp = next({ dev, dir });
const handle = nextApp.getRequestHandler();
const port = process.env.PORT || 3000;

nextApp
  .prepare()
  .then(() => {
    const server = express();

    server.use('/api', httpServer(store));
    server.get('*', (req, res) => {
      handle(req, res);
    });

    const conn = server.listen(port, (err) => {
      if (err) throw err;
      if (process.send) process.send('ready');
      log(`Ready on port ${port}`);
    });

    conn.on('upgrade', wsServer(store));
  })
  .catch((e) => {
    log('NextApp Prepare Error:', e);
  });
