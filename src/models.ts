import uuidv4 from 'uuid/v4';
import { registry as jobRegistry } from './jobs';
import { getTransactionsForAddress } from './providers';

const log = require('debug')('bitsights:models');

export interface JobCallback<Result> {
  (result: Result | undefined): void;
}

export abstract class Engine<Args, Result> {
  public abstract readonly name: string;

  public abstract validateArgs(args: Args): object | undefined;

  public execute(args: Args, callback?: JobCallback<Result>): string {
    const job = this.buildJob(args);

    log(`Starting job ${job.getType()}:${job.getUUID()}`);

    job.execute().then(() => {
      log(`Job ${job.getUUID()} finished.`);

      if (callback !== undefined) {
        callback(job.getResult());
      }
    }).catch((reason) => {
      log(`Job ${job.getUUID()} failed with reason: ${reason}`);
      job.setFailed();
    });

    return job.getUUID();
  }

  public executeForResults(args: Args): Promise<Result> {

    return new Promise<Result>((resolve) => {
      this.execute(args, resolve);
    });
  }

  protected abstract buildJob(args: Args): Job<Result>;
}

export abstract class Job<Result> {

  private readonly uuid: string;
  private readonly type: string;
  private result: Result | undefined;
  private status: 'running' | 'finished' | 'failed' = 'running';

  protected constructor(type: string) {
    this.uuid = uuidv4();
    this.type = type;
    jobRegistry.register(this);
  }

  public getUUID() {
    return this.uuid;
  }

  public getStatus() {
    return this.status;
  }

  public getType() {
    return this.type;
  }

  public getResult(): Result | undefined {
    return this.result;
  }

  public abstract execute(): Promise<void>;

  public setFailed() {
    this.status = 'failed';
  }

  public waitForResults(): Promise<Result> {

    return new Promise<Result>((resolve, reject) => {
      const checkForJobStatus = () => {
        switch (this.getStatus()) {
          case 'running':
            setTimeout(checkForJobStatus, 100);
            break;
          case 'finished':
            resolve(this.getResult());
            break;
          case 'failed':
            reject();
            break;
        }
      };

      checkForJobStatus();
    });
  }

  protected setResult(result: Result) {
    this.result = result;
    this.status = 'finished';
  }
}

export class Address {
  public readonly address: string;
  public readonly value?: number;

  constructor(address: string, value?: number) {
    this.address = address;
    this.value = value;
  }
}

export class Transaction {
  public readonly inputs: Address[];
  public readonly outputs: Address[];

  public readonly hash: string;
  public readonly time: number;

  constructor(hash: string, time: number, inputs: Address[], outputs: Address[]) {
    this.inputs = inputs;
    this.outputs = outputs;
    this.hash = hash;
    this.time = time;
  }

  public containsInputAddress(address: Address): boolean | null {
    if (this.inputs === undefined) {
      return null;
    }

    for (const input of this.inputs) {
      if (input.address === address.address) {
        return true;
      }
    }

    return false;
  }

  public async getChangeAddress(): Promise<Address | undefined> {
    if (this.outputs === undefined || this.outputs.length !== 2) {
      // This transaction has multiple outputs or a single one
      return;
    }

    let candidate: Address | undefined = undefined;

    for (const output of this.outputs) {
      // Find all the transaction previous to _fromTransaction_. If this was the first time
      // it was seen, it must be the change address.
      const addressTransactions = await getTransactionsForAddress(output);

      const previousAddressTransactions = addressTransactions
        .filter(tx => tx.time > 0 && tx.time < this.time);

      if (previousAddressTransactions.length === 0) {
        // This is the first time we see this address, it must be the change address

        if (candidate !== undefined) {
          // The two addresses are candidates. Let's ignore both.
          return;
        }

        candidate = output;
      }
    }

    if (candidate === undefined) {
      // No address is candidate
      return;
    }

    return candidate;
  }
}

export class Edge {
  public readonly source: Address;
  public readonly target: Address;
  public readonly transaction: Transaction;
  public readonly isChange: boolean;

  constructor(
    source: Address,
    target: Address,
    transaction: Transaction,
    isChange: boolean = false,
  ) {
    this.source = source;
    this.target = target;
    this.transaction = transaction;
    this.isChange = isChange;
  }
}
