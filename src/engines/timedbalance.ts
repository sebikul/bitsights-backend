import { getTransactionsForAddress } from '../bcoin';
import { Address, Engine, Job, Transaction } from '../models';
import { registry as engineRegistry } from './index';
import { RelatedAddressEngine } from './related';

const log = require('debug')('bitsights:engine:timedbalance');

interface DatasetEntry {
  t: number;
  y: number;
}

interface TimedBalanceJobResult {
  dataset: DatasetEntry[];
}

interface TimedBalanceArgs {
  needle_address: string;
}

class TimedBalanceJob extends Job<TimedBalanceJobResult> {

  private readonly needleAddress: Address;

  constructor(type: string, needleAddress: Address) {
    super(type);

    this.needleAddress = needleAddress;
  }

  public async execute(): Promise<void> {
    log('Finished balance for cluster');

    const engine = new RelatedAddressEngine();

    const cluster = await engine.executeForResults(
      { needle_address: this.needleAddress.address },
    );

    const transactions: Transaction[] = [];

    for (const address of cluster.addresses) {
      const thisTransactions = await getTransactionsForAddress(address);
      transactions.push(...thisTransactions);
    }

    // const addresses = cluster.addresses.map(a => a.address);

    const dataset: DatasetEntry[] = [];
    let currentBalance = 0;

    transactions.sort((a, b) => a.time - b.time);

    for (const transaction of transactions) {
      let balanceAfterThisTx = currentBalance;

      for (const input of transaction.inputs) {
        balanceAfterThisTx += input.value || 0;
      }

      for (const output of transaction.outputs) {
        balanceAfterThisTx += output.value || 0;
      }

      dataset.push({ t: transaction.time, y: balanceAfterThisTx });
      currentBalance = balanceAfterThisTx;
    }

    this.setResult({
      dataset,
    });
  }
}

export class TimedBalanceEngine extends Engine<TimedBalanceArgs, TimedBalanceJobResult> {
  readonly name: string = 'TIMED_BALANCE';

  public validateArgs(args: TimedBalanceArgs): object | undefined {
    if (!args.hasOwnProperty('needle_address')) {
      return { field: 'needle_address', message: 'missing field' };
    }
  }

  protected buildJob(args: TimedBalanceArgs): Job<TimedBalanceJobResult> {
    log(`Building timed balance job for ${args.needle_address}`);
    return new TimedBalanceJob(this.name, new Address(args.needle_address));
  }

}

engineRegistry.register(new TimedBalanceEngine());
