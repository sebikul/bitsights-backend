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
    };
    redis: {
      enabled: boolean;
      host: string;
      port: number;
    };
  }

  export default config;
}
