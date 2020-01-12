import { Address, Transaction } from '../models';

export interface Provider {
  (address: Address): Promise<Transaction[]>;
}

