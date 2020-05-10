const { NodeClient } = require('bclient');
import config from 'dos-config';
import { Address, Transaction } from '../models';
import { cacheFunctions as cache } from './cache';
import { Provider } from './types';

const log = require('debug')('bitsights:bcoin');

interface CoinResponse {
  address: string;
  value: number;
}

interface InputResponse {
  coin: CoinResponse;
}

interface OutputResponse {
  address: string;
  value: number;
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
  network: config.bcoin.testnet ? 'testnet' : 'main',
  port: config.bcoin.port,
  ssl: config.bcoin.ssl,
  timeout: 600000,
};

const client = new NodeClient(clientOptions);

async function performTransactionQuery(address: Address): Promise<TransactionResponse[]> {
  return await client.getTXByAddress(address.address)
    .catch((reason: any) => {
      console.log(reason);
    });
}

export const getTransactionsForAddress: Provider = async (
  address: Address,
): Promise<Transaction[]> => {

  log(`Querying blockchain for address ${address.address}`);

  let transactions: TransactionResponse[];
  let shouldWriteBack = false;

  if (config.cache === 'redis') {
    const data = await cache.get(`bcoin_${address.address}`);
    if (data === null || data === undefined) {
      shouldWriteBack = true;
      transactions = await performTransactionQuery(address);
    } else {
      transactions = JSON.parse(data);
    }
  } else {
    transactions = await performTransactionQuery(address);
  }

  if (config.cache === 'redis' && shouldWriteBack) {
    cache.set(`bcoin_${address.address}`, JSON.stringify(transactions ?? []), 'EX', 3600);
  }

  return (transactions ?? [])
    .map((tx) => {
      const inputs = tx.inputs
        .map(input => input.coin)
        .filter(coin => coin !== undefined) // Filter Coinbase transactions
        .map(coin => new Address(coin.address, coin.value / 100000000));

      const outputs = tx.outputs
        .map(output => new Address(output.address, output.value / 100000000));

      return new Transaction(tx.hash, tx.time, inputs, outputs);
    })
    .filter(tx => tx.time !== 0);
};
