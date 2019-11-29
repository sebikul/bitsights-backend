import _ from 'lodash';
import { getTransactionsForAddress } from '../bcoin';
import { Address, Edge, Engine, Job, JobCallback, Transaction } from '../models';
import { registry as engineRegistry } from './index';

const log = require('debug')('bitsights:engine:distance');

interface DistanceJobResult {
  edges: Edge[];
  addresses: Address[];
}

interface DistanceArgs {
  source: string;
  sink: string;
}

class DistanceJob extends Job<DistanceJobResult> {

  private readonly source: Address;
  private readonly sink: Address;

  private pathsQueue: Edge[][] = [];

  constructor(type: string, source: Address, sink: Address) {
    super(type);

    this.source = source;
    this.sink = sink;
  }

  public async execute(): Promise<void> {

    await this.populateQueueFromAddress([], this.source);

    while (this.pathsQueue.length > 0) {
      const thisPath = this.pathsQueue.shift();

      if (thisPath === undefined) {
        log('This should never happen');
        return;
      }

      const lastEdge = _.last(thisPath);

      if (lastEdge === undefined) {
        log('This should never happen');
        return;
      }
      if (lastEdge.target.address === this.sink.address) {
        log(`Path found: ${thisPath}`);
        this.transformPathToResult(thisPath);
        return;
      }

      await this.populateQueueFromAddress(thisPath, lastEdge.target, lastEdge.transaction);
    }

    log('Finished distance job');
  }

  private async populateQueueFromAddress(
    currentPath: Edge[],
    address: Address,
    sourceTx?: Transaction,
  ) {

    const transactions = (await getTransactionsForAddress(address))
      .filter(tx => sourceTx === undefined ? true : tx.hash !== sourceTx.hash)
      .filter(tx => tx.containsInputAddress(address));

    for (const transaction of transactions) {
      if (transaction.outputs === undefined) {
        continue;
      }

      for (const output of transaction.outputs) {

        const newPath = _.clone(currentPath);
        newPath.push({ source: address, transaction, target: output });

        log(`Pushing new edge: ${address.address} - ${transaction.hash} -> ${output.address}`);

        if (output.address === this.sink.address) {
          this.pathsQueue = [];
        }

        this.pathsQueue.push(newPath);
      }
    }
  }

  private transformPathToResult(path: Edge[]) {
    const addresses: Address[] = path.map(edge => edge.target);
    addresses.push(this.source);

    this.setResult({ addresses, edges: path });
  }
}

export class DistanceEngine extends Engine<DistanceArgs, DistanceJobResult> {
  readonly name: string = 'DISTANCE';

  execute(args: DistanceArgs, callback?: JobCallback<DistanceJobResult>): string {
    const job = new DistanceJob(this.name, new Address(args.source), new Address(args.sink));

    log(`Starting job for distance from ${args.source} to ${args.sink}`);

    job.execute().then(() => {
      log(`Job ${job.getUUID()} finished.`);

      if (callback !== undefined) {
        callback(job.getResult());
      }
    }).catch((reason) => {
      log(`Job ${job.getUUID()} failed with reason: ${reason}`);
    });

    return job.getUUID();
  }

  public validateArgs(args: DistanceArgs): object | undefined {
    if (!args.hasOwnProperty('source')) {
      return { field: 'source', message: 'missing field' };
    }
    if (!args.hasOwnProperty('sink')) {
      return { field: 'sink', message: 'missing field' };
    }
  }

}

engineRegistry.register(new DistanceEngine());
