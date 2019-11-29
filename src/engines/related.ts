import { flatten } from 'lodash';
import { getTransactionsForAddress } from '../bcoin';
import { Address, Edge, Engine, Job, JobCallback, Transaction } from '../models';
import { registry as engineRegistry } from './index';

const log = require('debug')('bitsights:engine:related');

interface RelatedJobResult {
  addresses: Address[];
  edges: Edge[];
}

interface RelatedArgs {
  needle_address: string;
}

class RelatedJob extends Job<RelatedJobResult> {

  private readonly source: Address;

  private addresses: Address[] = [];
  private edges: Edge[] = [];

  constructor(type: string, source: Address) {
    super(type);

    this.source = source;
  }

  public async execute(): Promise<void> {
    this.addresses.push(this.source);
    return this.findRelatedTo(this.source).then(() => {
      this.setResult({
        addresses: this.addresses,
        edges: this.edges,
      });
    });
  }

  private isPresentInCorpus(address: Address): boolean {
    return this.addresses.find(value => value.address === address.address) !== undefined;
  }

  /**
   * Coming from _fromTransaction_, find any transactions in which _address_ was an input
   * @param address
   * @param fromTransaction
   */
  private async findRelatedTo(address: Address, fromTransaction?: Transaction): Promise<Address[]> {
    const relatedPromises: Promise<Address[]>[] = [];

    log(`Finding new edges from ${address.address}`);

    // Filter transactions where _address_ was not an input
    const participatedInTransactions = (await getTransactionsForAddress(address))
      .filter(tx => fromTransaction === undefined ? true : tx.hash !== fromTransaction.hash)
      .filter(tx => tx.inputs !== undefined && tx.containsInputAddress(address));

    // We now have all the transactions in which _address_ was an input
    for (const tx of participatedInTransactions) {
      // Filter out current address from the inputs
      const filteredInputs = (tx.inputs as Address[])
        .filter(value => value.address !== address.address);

      // We now have all the inputs which are related to this address
      for (const input of filteredInputs) {

        if (this.isPresentInCorpus(input)) {
          // We have already traversed this node
          continue;
        }

        this.createEdge(address, input, tx);

        relatedPromises.push(this.findRelatedTo(input, tx));
      }

    }

    if (fromTransaction !== undefined) {
      relatedPromises.push(
        this.findChangeAddressForTx(fromTransaction, address).then(value => value ? [value] : []),
      );
    }

    const related = await Promise.all(relatedPromises);

    return flatten(related);
  }

  private async findChangeAddressForTx(
    fromTransaction: Transaction,
    fromAddress: Address,
  ): Promise<Address | undefined> {
    if (fromTransaction.outputs === undefined) {
      return;
    }

    if (fromTransaction.outputs.length !== 2) {
      // This transaction has multiple outputs or a single one
      return;
    }

    for (const output of fromTransaction.outputs) {
      // Find all the transaction previous to _fromTransaction_. If this was the first time
      // it was seen, it must be the change address.
      const addressTransactions = (await getTransactionsForAddress(output))
        .filter(tx => tx.time < fromTransaction.time);

      if (
        addressTransactions.length === 1 &&
        addressTransactions[0].hash === fromTransaction.hash
      ) {
        // This is the first time we see this address, it must be the change address
        this.createEdge(fromAddress, output, fromTransaction);
        return output;
      }
    }
  }

  private createEdge(from: Address, to: Address, tx?: Transaction) {
    this.addresses.push(to);

    if (tx !== undefined) {
      this.edges.push(new Edge(from, to, tx));
    }
  }
}

export class RelatedAddressEngine extends Engine<RelatedArgs, RelatedJobResult> {
  readonly name: string = 'RELATED';

  execute(args: RelatedArgs, callback?: JobCallback<RelatedJobResult>): string {
    const job = new RelatedJob(this.name, new Address(args.needle_address));

    log(`Starting job for related addresses to ${args.needle_address}`);

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

  public validateArgs(args: RelatedArgs): object | undefined {
    if (!args.hasOwnProperty('needle_address')) {
      return { field: 'needle_address', message: 'missing field' };
    }
  }
}

engineRegistry.register(new RelatedAddressEngine());
