const { NodeClient } = require('bclient');
import config from 'dos-config';
import redis from 'redis';
import { promisify } from 'util';
import { Address, Transaction } from './models';
import * as request from 'request-promise-native';

const log = require('debug')('bitsights:bcoin');

const redisClient = redis.createClient();
const getAsync = promisify(redisClient.get).bind(redisClient);

// const setAsync = promisify(redisClient.set).bind(redisClient);

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
    redisClient.set(address.address, JSON.stringify(transactions));
  }

  return transactions.map((tx) => {
    const inputs = tx.inputs
      .map(input => input.coin)
      .filter(coin => coin !== undefined) // Filter Coinbase transactions
      .map(coin => new Address(coin.address));

    const outputs = tx.outputs.map(output => new Address(output.address));

    return new Transaction(tx.hash, tx.time, inputs, outputs);
  });
}

export async function getBalance(address: Address) {

  const options = {
    json: true,
    uri: `https://testnet.blockchain.info/balance?active=${address.address}`,
  };

  const data = await request.get(options);

  return data[address.address]['final_balance'];
}
