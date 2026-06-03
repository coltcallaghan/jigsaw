import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jigsaw.app',
  appName: 'Jigsaw',
  webDir: 'dist-web',
  server: { androidScheme: 'https' },
};

export default config;
