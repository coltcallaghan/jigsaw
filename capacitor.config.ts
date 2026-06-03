import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.coltcallaghan.jigsaw',
  appName: 'Jigsaw',
  webDir: 'dist-web',
  server: { androidScheme: 'https' },
};

export default config;
