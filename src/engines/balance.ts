import { getTransactionsForAddress } from '../bcoin';
import { Address, Engine, Job, Transaction } from '../models';
import { registry as engineRegistry } from './index';
import { RelatedAddressEngine } from './related';

const log = require('debug')('bitsights:engine:balance');

interface BalanceJobResult {
  balance: number;
}

interface BalanceArgs {
  needle_address: string;
}

class BalanceJob extends Job<BalanceJobResult> {

  private readonly needleAddress: Address;

  constructor(type: string, needleAddress: Address) {
    super(type);

    this.needleAddress = needleAddress;
  }

  public async execute(): Promise<void> {
    log('Finding balance for cluster');

    const engine = new RelatedAddressEngine();

    const cluster = await engine.executeForResults(
      { needle_address: this.needleAddress.address },
    );

    let balance = 0;

    // const chunks = _.chunk(cluster.addresses, 10);
    //
    // for (const address of chunks) {
    //   const thisBalance = await getBalance(address);
    //
    //   balance += thisBalance;
    // }

    const transactions: Transaction[] = [];

    for (const address of cluster.addresses) {
      const thisTransactions = await getTransactionsForAddress(address);
      transactions.push(...thisTransactions);
    }

    transactions.sort((a, b) => a.time - b.time);

    for (const transaction of transactions) {
      let balanceAfterThisTx = balance;

      for (const input of transaction.inputs) {
        balanceAfterThisTx += input.value || 0;
      }

      for (const output of transaction.outputs) {
        balanceAfterThisTx += output.value || 0;
      }

      balance = balanceAfterThisTx;
    }

    this.setResult({
      balance,
    });
  }
}

export class BalanceEngine extends Engine<BalanceArgs, BalanceJobResult> {
  readonly name: string = 'BALANCE';

  public validateArgs(args: BalanceArgs): object | undefined {
    if (!args.hasOwnProperty('needle_address')) {
      return { field: 'needle_address', message: 'missing field' };
    }
  }

  protected buildJob(args: BalanceArgs): Job<BalanceJobResult> {
    log(`Building balance job for ${args.needle_address}`);
    return new BalanceJob(this.name, new Address(args.needle_address));
  }

}

engineRegistry.register(new BalanceEngine());
