import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import { ConfigService } from '../config';

@Injectable()
export class HashingService {
  constructor(private readonly config: ConfigService) {}

  private get hashingOptions(): argon2.Options & { raw?: false } {
    return {
      type: argon2.argon2id,
      timeCost: this.config.argon2TimeCost,
    };
  }

  hash(value: string): Promise<string> {
    return argon2.hash(value, this.hashingOptions);
  }

  hashPassword(password: string): Promise<string> {
    return this.hash(password);
  }

  generateHexToken(size = 32): string {
    return randomBytes(size).toString('hex');
  }

  verify(hash: string, plainValue: string): Promise<boolean> {
    return argon2.verify(hash, plainValue);
  }

  verifyPassword(password: string, passwordHash: string): Promise<boolean> {
    return this.verify(passwordHash, password);
  }

  needsRehash(hash: string): boolean {
    return argon2.needsRehash(hash, {
      ...this.hashingOptions,
    });
  }
}
