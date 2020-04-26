import config from 'dos-config';
import { getTransactionsForAddress as bcoin } from './bcoin';
import { getTransactionsForAddress as blockchair } from './blockchair';
import { getTransactionsForAddress as blockcypher } from './blockcypher';
import { Provider } from './types';

function getConfiguredProvider(): Provider {
  switch (config.provider) {
    case 'bcoin':
      return bcoin;
    case 'blockcypher':
      return blockcypher;
    case 'blockchair':
      return blockchair;
  }
}

export const getTransactionsForAddress: Provider = getConfiguredProvider();
