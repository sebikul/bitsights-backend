import config from 'dos-config';
import fs from 'fs';
import yargs from 'yargs';
import { BalanceEngine } from './engines/balance';
import { DistanceEngine } from './engines/distance';
import { RelatedAddressEngine } from './engines/related';
import { RelationshipEngine } from './engines/relationship';
import { buildGraphFromEdges } from './graph';

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

function getFilenameFromOutput(output: string, defaultName: string) {
  return output.length > 0 ? output : defaultName;
}

function buildGraph(result: any, output: string) {
  if (result === undefined) {
    log('Unable to load result');
    return;
  }

  const graph = buildGraphFromEdges(result.edges);
  // console.log(graph);
  fs.writeFileSync(output, graph);
}

function findRelated(source: string, output: string) {
  const engine = new RelatedAddressEngine();
  const filename = getFilenameFromOutput(
    output,
    `related_${source}.dot`,
  );

  const jobUUID = engine.execute(
    { needle_address: source },
    (result: any) => buildGraph(result, filename),
  );

  log(`Finding addresses related to ${source}. Job ${jobUUID}`);
}

function findDistance(source: string, sink: string, output: string) {
  const engine = new DistanceEngine();
  const filename = getFilenameFromOutput(
    output,
    `distance_${source}_to_${sink}.dot`,
  );
  const jobUUID = engine.execute(
    { sink, source },
    (result: any) => buildGraph(result, filename),
  );

  log(`Finding distance from ${source} to ${sink}. Job ${jobUUID}`);
}

function findRelationship(left: string, right: string, output: string) {
  const engine = new RelationshipEngine();
  const filename = getFilenameFromOutput(
    output,
    `relationship_${left}_${right}.dot`,
  );

  const jobUUID = engine.execute(
    { left, right },
    (result: any) => buildGraph(result, filename),
  );

  log(`Finding relationships from ${left} to ${right}. Job ${jobUUID}`);
}

function findBalance(source: string) {
  const engine = new BalanceEngine();

  const jobUUID = engine.execute(
    { needle_address: source },
    result => log(`The balance is ${result ? result.balance : 0} mBTC`),
  );

  log(`Finding balance of cluster ${source}. Job ${jobUUID}`);
}

yargs
  .command(['start'], 'run the daemon', yargs => yargs, startDaemon)
  .command(
    'related <source> [output]',
    'Find related addresses', {
      output: {
        default: '',
        describe: 'Source address',
        type: 'string',
      },
      source: {
        default: '',
        describe: 'Source address',
        type: 'string',
      },
    },
    args => findRelated(args.source, args.output),
  )
  .command(
    'distance <source> <sink> [output]',
    'Find distance between addresses', {
      output: {
        default: '',
        describe: 'Source address',
        type: 'string',
      },
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
    args => findDistance(args.source, args.sink, args.output),
  )
  .command(
    'relationship <left> <right> [output]',
    'Find relationships between two clusters', {
      left: {
        default: '',
        describe: 'Left address',
        type: 'string',
      },
      output: {
        default: '',
        describe: 'Source address',
        type: 'string',
      },
      right: {
        default: '',
        describe: 'Right address',
        type: 'string',
      },
    },
    args => findRelationship(args.left, args.right, args.output),
  )
  .command(
    'balance <source>',
    'Find balance of cluster', {
      source: {
        default: '',
        describe: 'Source address',
        type: 'string',
      },
    },
    args => findBalance(args.source),
  )
  .wrap(yargs.terminalWidth()).argv;
