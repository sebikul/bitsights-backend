declare module 'dos-config' {
  const config: Config;

  interface Config {
    env: string;
    port: number;
    bcoin: {
      apiKey: string;
      port: number;
      host: string;
      testnet: boolean;
      ssl: boolean;
    };
    redis: {
      host: string;
      port: number;
    };
    fileCache: {
      path: string;
    };
    cache: 'redis' | 'file' | 'none';
    provider: 'bcoin' | 'blockcypher' | 'blockchair';
    chain: 'mainnet' | 'testnet';
    blockChairApiKey: string;
  }

  export default config;
}
