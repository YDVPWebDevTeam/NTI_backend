import type { Client } from 'pg';

export type SeedContext = {
  client: Client;
  hashPassword: (plainPassword: string) => Promise<string>;
  now: () => Date;
};

export type SeedTask = {
  name: string;
  run: (context: SeedContext) => Promise<void>;
};
