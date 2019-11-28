import config from 'dos-config';
import yargs from 'yargs';

import { DistanceEngine } from './engines/distance';
import { RelatedAddressEngine } from './engines/related';

config.env = process.env.NODE_ENV || config.env;

const log = require('debug')('bitsights:index');

function startDaemon() {
  const app = require('./app').default;

  const server = app.listen(config.port, () => {
    log(`Express server listening on port: ${config.port}`);
    log('Server running successfully');
  });

  process.on('SIGTERM', () => {
    log('Received SIGTERM. Requesting exit.');

    server.close(() => {
      log('Server closed, exiting smoothly');
      process.exit(0);
    });
  });
}

function findRelated(source: string) {
  const engine = new RelatedAddressEngine();

  const jobUUID = engine.execute({ needle_address: source });

  log(`Finding addresses related to ${source}. Job ${jobUUID}`);
}

function findDistance(source: string, sink: string) {
  const engine = new DistanceEngine();

  const jobUUID = engine.execute({
    sink,
    source,
  });

  log(`Finding distance from ${source} to ${sink}. Job ${jobUUID}`);
}

yargs
  .command(['start', '$0'], 'run the daemon', yargs => yargs, startDaemon)
  .command(
    'related <source>',
    'Find related addresses', {
      source: {
        default: '',
        describe: 'Source address',
        type: 'string',
      },
    },
    args => findRelated(args.source),
  )
  .command(
    'distance <source> <sink>',
    'Find distance between addresses', {
      sink: {
        default: '',
        describe: 'Sink address',
        type: 'string',
      },
      source: {
        default: '',
        describe: 'Source address',
        type: 'string',
      },
    },
    args => findDistance(args.source, args.sink),
  ).argv;
