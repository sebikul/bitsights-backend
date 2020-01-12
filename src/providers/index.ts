import config from 'dos-config';
import { getTransactionsForAddress as bcoin } from './bcoin';
import { getTransactionsForAddress as blockcypher } from './blockcypher';
import { Provider } from './types';

function getConfiguredProvider(): Provider {
  if (config.provider === 'bcoin') {
    return bcoin;
  }
  return blockcypher;
}

export const getTransactionsForAddress: Provider = getConfiguredProvider();
