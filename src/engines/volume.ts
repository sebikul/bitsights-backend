import { Address, Engine, Job, Transaction } from '../models';
import { getTransactionsForAddress } from '../providers';
import { registry as engineRegistry } from './index';
import { RelatedAddressEngine } from './related';

const log = require('debug')('bitsights:engine:volume');

interface VolumeJobResult {
  inbound: number;
  outbound: number;
}

interface VolumeArgs {
  needle_address: string;
}

class VolumeJob extends Job<VolumeJobResult> {

  private readonly needleAddress: Address;

  constructor(type: string, needleAddress: Address) {
    super(type);

    this.needleAddress = needleAddress;
  }

  public async execute(): Promise<void> {
    log('Finding volume for cluster');

    const engine = new RelatedAddressEngine();

    const cluster = await engine.executeForResults(
      { needle_address: this.needleAddress.address },
    );

    const rawAddressCluster: string[] = cluster.addresses.map(a => a.address);

    const transactions: Transaction[] = [];

    for (const address of cluster.addresses) {
      const thisTransactions = await getTransactionsForAddress(address);
      transactions.push(...thisTransactions);
    }

    let inboundBalance = 0;
    let outboundBalance = 0;

    for (const transaction of transactions) {

      const clusterInputs = transaction.inputs.filter(i => rawAddressCluster.includes(i.address));
      const clusterOutputs = transaction.outputs.filter(i => rawAddressCluster.includes(i.address));

      for (const input of clusterInputs) {
        outboundBalance -= input.value ?? 0;
      }

      for (const output of clusterOutputs) {
        inboundBalance += output.value ?? 0;
      }

    }

    this.setResult(
      {
        inbound: inboundBalance,
        outbound: outboundBalance,
      });
  }
}

export class VolumeEngine extends Engine<VolumeArgs, VolumeJobResult> {
  readonly name: string = 'VOLUME';

  public validateArgs(args: VolumeArgs): object | undefined {
    if (!args.hasOwnProperty('needle_address')) {
      return { field: 'needle_address', message: 'missing field' };
    }
  }

  protected buildJob(args: VolumeArgs): Job<VolumeJobResult> {
    log(`Building volume job for ${args.needle_address}`);
    return new VolumeJob(this.name, new Address(args.needle_address));
  }

}

engineRegistry.register(new VolumeEngine());
