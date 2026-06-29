import type { DBProvider } from './db-provider';
import { NeonDBProvider } from './neon-provider';
import { config } from '../config';

let instance: DBProvider | null = null;

export function getDBProvider(): DBProvider {
  if (!instance) {
    instance = new NeonDBProvider(config.databaseUrl);
  }
  return instance;
}

export type { DBProvider } from './db-provider';
