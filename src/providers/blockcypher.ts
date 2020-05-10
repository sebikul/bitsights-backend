import config from 'dos-config';
import * as request from 'request-promise-native';
import { Address, Transaction } from '../models';
import { cacheFunctions as cache } from './cache';
import { Provider } from './types';

const log = require('debug')('bitsights:blockcypher');

interface InputResponse {
  addresses: string[];
  output_value: number;
}

interface OutputResponse {
  addresses: string[];
  value: number;
}

interface TransactionResponse {
  hash: string;
  inputs: InputResponse[];
  outputs: OutputResponse[];
  received: string;
}

interface Response {
  txs: TransactionResponse[];
}

export const getTransactionsForAddress: Provider = async (
  address: Address,
): Promise<Transaction[]> => {

  log(`Querying blockcypher for address ${address.address}`);

  let response: Response;
  let shouldWriteBack = false;

  if (config.cache !== 'none') {
    const data = await cache.get(`blockcypher_${address.address}`);
    if (data === null || data === undefined) {
      shouldWriteBack = true;
      response = JSON.parse(await request.get(`https://api.blockcypher.com/v1/btc/main/addrs/${address.address}/full?limit=50`));
    } else {
      response = JSON.parse(data);
    }
  } else {
    response = JSON.parse(await request.get(`https://api.blockcypher.com/v1/btc/main/addrs/${address.address}/full?limit=50`));
  }

  if (config.cache !== 'none' && shouldWriteBack) {
    cache.set(`blockcypher_${address.address}`, JSON.stringify(response), 'EX', 3600);
  }

  return response.txs
    .map((tx) => {
      const inputs = tx.inputs
        .map(i => new Address(i.addresses[0], i.output_value / 100000000));

      const outputs = tx.outputs
        .map(output => new Address(output.addresses[0], output.value / 100000000));

      return new Transaction(tx.hash, new Date(tx.received).getTime() / 1000, inputs, outputs);
    })
    .filter(tx => tx.time !== 0);
};
