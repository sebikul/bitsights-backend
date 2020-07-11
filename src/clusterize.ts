import { asyncify, parallelLimit } from 'async';
import crypto from 'crypto';
import { RelatedAddressEngine } from './engines/related';
import { client } from './providers/bcoin';

const log = require('debug')('bitsights:clusterize');

export const md5 = (contents: string) => crypto.createHash('md5').update(contents).digest('hex');

interface Transaction {
  txid: string;
  outputs: {
    address: string;
  }[];
}

interface Block {
  hash: string;
  txs: Transaction[];
}

export default async function () {
  const tip = await getTip();
  log(`Found tip: ${tip}`);

  const clusters = new Map<string, string>(); // Map of address to cluster hash

  for (let i = 1779462; i < tip; i += 1) {
    // log(`Fetching block ${i}`);
    const block = await getBlock(i);
    // log(`Parsing ${block.hash}`);
    await processBlock(block, clusters);
    log(`Block ${i}, Clusters: ${new Set(clusters.values()).size}, Addresses processed: ${clusters.size}`);
  }

  const groupedClusters = new Map<string, string[]>();

  for (const [key, value] of clusters.entries()) {
    if (groupedClusters.has(value)) {
      groupedClusters.get(value)!.push(key);
    } else {
      groupedClusters.set(value, [key]);
    }
  }

  log('Clusters: %O', groupedClusters);
}

async function getBlock(height: number): Promise<Block> {
  return client.getBlock(height);
}

async function getTip() {
  const info = await client.getInfo();

  return info.chain.height;
}

async function processBlock(block: Block, clusters: Map<string, string>) {
  const addresses = new Set<string>();
  for (const transaction of block.txs) {
    for (const output of transaction.outputs) {
      addresses.add(output.address);
    }
  }

  const functions = Array.from(addresses.values()).map(address => asyncify(async () => {

    if (clusters.has(address)) {
      return;
    }

    const engine = new RelatedAddressEngine();
    const thisCluster = await engine.executeForResults(
      { needle_address: address },
    );
    const addresses = thisCluster.addresses.map(address => address.address);
    const clusterHash = hashCluster(addresses);
    for (const thisAddress of addresses) {
      clusters.set(thisAddress, clusterHash);
    }
  }));

  return new Promise((resolve) => {
    parallelLimit(functions, 5, () => {
      resolve();
    });
  });
}

function hashCluster(addresses: string[]) {
  return md5(addresses.sort().join('|'));
}
