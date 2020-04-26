import config from 'dos-config';
import { chunk, flatten, get } from 'lodash';

import * as request from 'request-promise-native';
import { Address, Transaction } from '../models';
import { cacheFunctions as cache } from './cache';
import { Provider } from './types';

const log = require('debug')('bitsights:blockchair');

function getChain() {
  switch (config.chain) {
    case 'mainnet':
      return 'bitcoin';
    case 'testnet':
      return 'bitcoin/testnet';
  }
  throw new Error('Invalid chain');
}

const BASE_URL = 'https://api.blockchair.com';

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

const throttledGetURL = request.get;

// const throttledGetURL = throttle(request.get, 500);

async function getURLAndCacheResponse(url: string): Promise<any> {
  let realUrl: string;

  if (config.blockChairApiKey) {
    if (url.indexOf('?') > 0) {
      realUrl = `${url}&key=${config.blockChairApiKey}`;
    } else {
      realUrl = `${url}?key=${config.blockChairApiKey}`;
    }
  } else {
    realUrl = url;
  }

  if (config.cache !== 'none') {
    const data = await cache.get(url);

    if (data === null || data === undefined) {
      return await throttledGetURL(realUrl).then((response) => {
        cache.set(url, response, 'EX', 3600);
        return response;
      }).then(JSON.parse).catch((error) => {
        log(`Request to ${realUrl} failed: ${error}`);
        throw new Error(error);
      });
    }
    // log('Request is cached');
    return JSON.parse(data);
  }

  return throttledGetURL(realUrl).then(JSON.parse).catch((error) => {
    log(`Request to ${realUrl} failed: ${error}`);
  });
}

async function getRawTransactionsForAddress(address: Address): Promise<string[]> {
  const url = buildUrl(`dashboards/address/${address.address}?limit=10000,0`);

  const addressData = await getURLAndCacheResponse(url);

  const transactions = get(addressData, `data.${address.address}.transactions`);

  if (transactions === undefined) {
    debugger;
  }

  return transactions as string[];
}

async function getTransactionsData(transactions: string[]): Promise<Transaction[]> {

  if (transactions.length <= 10) {
    const url = buildUrl(`dashboards/transactions/${transactions.sort().join(',')}`);

    const transactionsRawData = await getURLAndCacheResponse(url);

    const transactionData: any[] = transactions.map(tx => get(transactionsRawData, `data.${tx}`));

    if (transactionData.some(txData => txData === undefined)) {
      debugger;
    }

    return transactionData.filter(transactionData => transactionData !== undefined).map(mapTransactionDataToObject);
  }

  const chunks = chunk(transactions.sort(), 10);

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
