import uuidv4 from 'uuid/v4';

export abstract class Engine<Args> {
  public abstract readonly name: string;

  public abstract validateArgs(args: Args): object | undefined;

  public abstract execute(args: Args): string ;
}

export abstract class Job<Result> {

  private readonly uuid: string;
  private result: Result | undefined;
  private status: 'running' | 'finished' = 'running';

  protected constructor() {
    this.uuid = uuidv4();
  }

  public getUUID(): string {
    return this.uuid;
  }

  public getStatus() {
    return this.status;
  }

  public getResult(): Result | undefined {
    return this.result;
  }

  public abstract execute(): Promise<void>;

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
