import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.envmanager.app',
  appName: 'EnvManager',
  webDir: 'public',
  server: {
    url: 'https://env-manage.vercel.app/',
    cleartext: true
  }
};

export default config;
