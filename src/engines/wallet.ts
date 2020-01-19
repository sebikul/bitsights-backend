import { Address, Engine, Job, Transaction } from '../models';
import { getTransactionsForAddress } from '../providers';
import { registry as engineRegistry } from './index';
import { RelatedAddressEngine } from './related';

const log = require('debug')('bitsights:engine:wallet');

interface WalletJobResult {
  probability: number;
  conclusion: string;
}

interface WalletArgs {
  needle_address: string;
}

// Interface for common critera functions
interface Criteria {
  (transaction: Transaction): boolean;
}

// Criteria that takes into account the number of outputs of a transaction
const numberOfOutputs: Criteria = transaction => transaction.outputs.length === 2;

class WalletJob extends Job<WalletJobResult> {

  private readonly needleAddress: Address;

  constructor(type: string, needleAddress: Address) {
    super(type);

    this.needleAddress = needleAddress;
  }

  public async execute(): Promise<void> {
    log('Calculating probability of wallet for cluster');

    const engine = new RelatedAddressEngine();

    const cluster = await engine.executeForResults(
      { needle_address: this.needleAddress.address },
    );

    const transactions: Transaction[] = [];

    for (const address of cluster.addresses) {
      const thisTransactions = await getTransactionsForAddress(address);
      transactions.push(...thisTransactions);
    }

    const total = transactions.length;
    const probableFromWallet = transactions.filter(numberOfOutputs).length;

    const probability = probableFromWallet / total;

    this.setResult(
      {
        conclusion: probabilityToConclusion(probability),
        probability,
      });
  }
}

export class WalletEngine extends Engine<WalletArgs, WalletJobResult> {
  readonly name: string = 'WALLET';

  public validateArgs(args: WalletArgs): object | undefined {
    if (!args.hasOwnProperty('needle_address')) {
      return { field: 'needle_address', message: 'missing field' };
    }
  }

  protected buildJob(args: WalletArgs): Job<WalletJobResult> {
    log(`Building timed balance job for ${args.needle_address}`);
    return new WalletJob(this.name, new Address(args.needle_address));
  }

}

function probabilityToConclusion(probability: number): string {
  if (probability > 0.75) {
    return 'Surely a wallet';
  }
  if (probability > 0.25 && probability <= 0.75) {
    return 'Probably a wallet';
  }
  if (probability <= 0.25) {
    return 'Probably an exchange';
  }

  return 'Never gonna happen :)';
}

engineRegistry.register(new WalletEngine());
