import { Address, Edge, Engine, Job } from '../models';
import { getTransactionsForAddress } from '../providers';
import { registry as engineRegistry } from './index';
import { RelatedAddressEngine } from './related';

const log = require('debug')('bitsights:engine:relationship');

interface Cluster {
  addresses: Address[];
  edges: Edge[];
}

interface RelationshipJobResult {
  rightCluster: Cluster;
  leftCluster: Cluster;
  crossEdges: Edge[];
}

interface RelationshipArgs {
  right: string;
  left: string;
}

class RelationshipJob extends Job<RelationshipJobResult> {

  private readonly right: Address;
  private readonly left: Address;

  constructor(type: string, right: Address, left: Address) {
    super(type);

    this.right = right;
    this.left = left;
  }

  public async execute(): Promise<void> {
    log('Finished relationships between clusters');

    const engine = new RelatedAddressEngine();

    const rightCluster = await engine.executeForResults(
      { needle_address: this.right.address },
    );

    const leftCluster = await engine.executeForResults(
      { needle_address: this.left.address },
    );

    const crossEdges: Edge[] = [];

    await this.findRelationships(rightCluster.addresses, leftCluster.addresses, crossEdges);
    await this.findRelationships(leftCluster.addresses, rightCluster.addresses, crossEdges);

    this.setResult({
      crossEdges,
      leftCluster,
      rightCluster,
    });
  }

  private async findRelationships(from: Address[], to: Address[], addTo: Edge[]) {
    for (const address of from) {
      const transactions = await getTransactionsForAddress(address);

      for (const transaction of transactions) {
        if (transaction.outputs === undefined) {
          continue;
        }

        for (const output of transaction.outputs) {

          const hasCrossEdge = to.find(
            otherAddress => output.address === otherAddress.address,
          );

          if (hasCrossEdge) {
            addTo.push(new Edge(address, output, transaction));
          }

        }
      }

    }
  }

}

export class RelationshipEngine extends Engine<RelationshipArgs, RelationshipJobResult> {
  readonly name: string = 'RELATIONSHIP';

  public validateArgs(args: RelationshipArgs): object | undefined {
    if (!args.hasOwnProperty('right')) {
      return { field: 'right', message: 'missing field' };
    }
    if (!args.hasOwnProperty('left')) {
      return { field: 'left', message: 'missing field' };
    }
  }

  protected buildJob(args: RelationshipArgs): Job<RelationshipJobResult> {
    log(`Building relationship job for ${args.right} to ${args.left}`);
    return new RelationshipJob(this.name, new Address(args.right), new Address(args.left));
  }

}

engineRegistry.register(new RelationshipEngine());
