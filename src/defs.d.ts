declare module 'dos-config' {
  const config: Config;

  interface Config {
    env: string;
    port: number;
    bcoin: {
      apiKey: string;
      port: number;
      host: string;
    };
  }

  export default config;
}
