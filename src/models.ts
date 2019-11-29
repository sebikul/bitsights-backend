import uuidv4 from 'uuid/v4';
import { registry as jobRegistry } from './jobs';

export interface JobCallback<Result> {
  (result: Result | undefined): void;
}

export abstract class Engine<Args, Result> {
  public abstract readonly name: string;

  public abstract validateArgs(args: Args): object | undefined;

  public abstract execute(args: Args, callback?: JobCallback<Result>): string ;
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

  protected setResult(result: Result) {
    this.result = result;
    this.status = 'finished';
  }
}

export class Address {
  public readonly address: string;

  constructor(address: string) {
    this.address = address;
  }
}

export class Transaction {
  public readonly inputs?: Address[];
  public readonly outputs?: Address[];

  public readonly hash: string;
  public readonly time: number;

  constructor(hash: string, time: number, inputs?: Address[], outputs?: Address[]) {
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
}

export class Edge {
  public readonly source: Address;
  public readonly target: Address;
  public readonly transaction: Transaction;

  constructor(source: Address, target: Address, transaction: Transaction) {
    this.source = source;
    this.target = target;
    this.transaction = transaction;
  }
}
