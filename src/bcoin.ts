const { NodeClient } = require('bclient');
import config from 'dos-config';
import { Address, Transaction } from './models';

interface CoinResponse {
  address: string;
}

interface InputResponse {
  coin: CoinResponse;
}

interface OutputResponse {
  address: string;
}

interface TransactionResponse {
  hash: string;
  inputs: InputResponse[];
  outputs: OutputResponse[];
  time: number;
}

const clientOptions = {
  apiKey: config.bcoin.apiKey,
  host: config.bcoin.host,
  network: 'testnet',
  port: config.bcoin.port,
  ssl: true,
};

const client = new NodeClient(clientOptions);

export async function getTransactionsForAddress(address: Address): Promise<Transaction[]> {
  const transactions: TransactionResponse[] = await client.getTXByAddress(address.address)
    .catch((reason: any) => {
      console.log(reason);
    });

  return transactions.map((tx) => {
    const inputs = tx.inputs
      .map(input => input.coin)
      .filter(coin => coin !== undefined) // Filter Coinbase transactions
      .map(coin => new Address(coin.address));

    const outputs = tx.outputs.map(output => new Address(output.address));

    return new Transaction(tx.hash, tx.time, inputs, outputs);
  });
}
