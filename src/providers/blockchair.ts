import { chunk, flatten, get } from 'lodash';
import redis, { RedisClient } from 'redis';
import * as request from 'request-promise-native';
import { promisify } from 'util';
import { Address, Transaction } from '../models';
import { Provider } from './types';

import config from 'dos-config';

const log = require('debug')('bitsights:blockchair');

let redisClient: RedisClient;
let getAsync: any;

function getChain() {
  switch (config.chain) {
    case 'mainnet':
      return 'bitcoin';
    case 'testnet':
      return 'bitcoin/testnet';
  }
  throw new Error('Invalid chain');
}

const BASE_URL = 'https://api.blockchair.com/';

if (config.redis.enabled) {
  redisClient = redis.createClient(
    {
      host: config.redis.host,
      port: config.redis.port,
    });
  getAsync = promisify(redisClient.get).bind(redisClient);
}

function buildUrl(suffix: string) {
  return `${BASE_URL}/${getChain()}/${suffix}`;
}

function mapTransactionDataToObject(transactionData: any): Transaction {
  const inputs = transactionData.inputs
    .filter((input: any) => !input.is_from_coinbase) // Filter Coinbase transactions
    .map((input: any) => new Address(input.recipient, input.value / 100000000));

  const outputs = transactionData.outputs
    .map((output: any) => new Address(output.recipient, output.value / 100000000));

  return new Transaction(transactionData.transaction.hash, Date.parse(transactionData.transaction.time), inputs, outputs);
}

async function getURLAndCacheResponse(url: string): Promise<any> {
  if (config.redis.enabled) {
    const data = await getAsync(url);

    if (data === null) {
      return await request.get(url).then((response) => {
        redisClient.set(url, response, 'EX', 3600);
        return response;
      }).then(JSON.parse);
    }
    // log('Request is cached');
    return JSON.parse(data);
  }

  return request.get(url).then(JSON.parse);
}

async function getRawTransactionsForAddress(address: Address): Promise<string[]> {
  const url = buildUrl(`dashboards/address/${address.address}`);

  const addressData = await getURLAndCacheResponse(url);

  const transactions = get(addressData, `data.${address.address}.transactions`);

  return transactions as string[];
}

async function getTransactionsData(transactions: string[]): Promise<Transaction[]> {

  if (transactions.length <= 10) {
    const url = buildUrl(`dashboards/transactions/${transactions.join(',')}`);

    const transactionsRawData = await getURLAndCacheResponse(url);

    const transactionData: any[] = transactions.map(tx => get(transactionsRawData, `data.${tx}`));

    return transactionData.map(mapTransactionDataToObject);
  }

  const chunks = chunk(transactions, 10);

  const responses = await Promise.all(chunks.map(getTransactionsData));

  return flatten(responses);
}

export const getTransactionsForAddress: Provider = async (
  address: Address,
): Promise<Transaction[]> => {

  log(`Querying blockchair for address ${address.address}`);

  const transactions = await getRawTransactionsForAddress(address);

  return getTransactionsData(transactions);
};
