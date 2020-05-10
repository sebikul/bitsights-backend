import * as crypto from 'crypto';
import config from 'dos-config';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import redis from 'redis';
// import slug from 'slug';
import { promisify } from 'util';

export const md5 = (contents: string) => crypto.createHash('md5').update(contents).digest('hex');

const keyFunction = md5;

const fileCacheGet: CacheFunctions['get'] = (key: string, defaultValue?: string): Promise<string | undefined> => {
  const path = join(config.fileCache.path, config.chain, `${keyFunction(key)}.json`);

  if (!existsSync(path)) {
    return new Promise(resolve => resolve(defaultValue));
  }

  return new Promise(resolve => resolve(readFileSync(path, 'utf8')));
};

const fileCacheSet: CacheFunctions['set'] = (key: string, value: string) => {
  const path = join(config.fileCache.path, config.chain, `${keyFunction(key)}.json`);

  writeFileSync(path, value);
};

interface CacheFunctions {
  get(key: string, defaultValue?: string): Promise<string | undefined>;

  set(key: string, value: string, mode?: string, expiration?: number): void;
}

function getCacheFunctions(): CacheFunctions {
  switch (config.cache) {
    case 'redis':
      const redisClient = redis.createClient(
        {
          host: config.redis.host,
          port: config.redis.port,
        });
      return {
        get: promisify(redisClient.get).bind(redisClient),
        set: redisClient.set,
      };
    case 'file':
      return {
        get: fileCacheGet,
        set: fileCacheSet,
      };
  }
  return {
    get(_: string, defaultValue?: string): Promise<string | undefined> {
      return new Promise(resolve => resolve(defaultValue));
    },
    set(_: string, __: string): void {
    },
  };
}

export const cacheFunctions = getCacheFunctions();
