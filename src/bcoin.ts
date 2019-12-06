const { NodeClient } = require('bclient');
import config from 'dos-config';
import _ from 'lodash';
import redis, { RedisClient } from 'redis';
import * as request from 'request-promise-native';
import { promisify } from 'util';
import { Address, Transaction } from './models';

const log = require('debug')('bitsights:bcoin');

let redisClient: RedisClient;
let getAsync: any;

if (config.redis.enabled) {
  redisClient = redis.createClient({
    host: config.redis.host,
    port: config.redis.port,
  });
  getAsync = promisify(redisClient.get).bind(redisClient);
}

// const setAsync = promisify(redisClient.set).bind(redisClient);

interface CoinResponse {
  address: string;
  value: number;
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
  network: config.bcoin.testnet ? 'testnet' : 'main',
  port: config.bcoin.port,
  ssl: true,
};

const client = new NodeClient(clientOptions);

async function performTransactionQuery(address: Address): Promise<TransactionResponse[]> {
  return await client.getTXByAddress(address.address)
    .catch((reason: any) => {
      console.log(reason);
    });
}

export async function getTransactionsForAddress(address: Address): Promise<Transaction[]> {

  log(`Querying blockchain for address ${address.address}`);

  let transactions: TransactionResponse[];
  let shouldWriteBack = false;

  if (config.redis.enabled) {
    const data = await getAsync(address.address);
    if (data === null) {
      shouldWriteBack = true;
      transactions = await performTransactionQuery(address);
    } else {
      transactions = JSON.parse(data);
    }
  } else {
    transactions = await performTransactionQuery(address);
  }

  if (config.redis.enabled && shouldWriteBack) {
    redisClient.set(address.address, JSON.stringify(transactions), 'EX', 3600);
  }

  return transactions
    .map((tx) => {
      const inputs = tx.inputs
        .map(input => input.coin)
        .filter(coin => coin !== undefined) // Filter Coinbase transactions
        .map(coin => new Address(coin.address, coin.value));

      const outputs = tx.outputs.map(output => new Address(output.address));

      return new Transaction(tx.hash, tx.time, inputs, outputs);
    })
    .filter(tx => tx.time !== 0);
}

export async function getBalance(addresses: Address[]) {

  const addressList = addresses.map(address => address.address).join('|');

  const options = {
    json: true,
    uri: `https://${config.bcoin.testnet ? 'testnet.' : ''}blockchain.info/balance?active=${addressList}`,
  };

  const data = await request.get(options);

  return _.sumBy(Object.values(data), 'final_balance');
}
