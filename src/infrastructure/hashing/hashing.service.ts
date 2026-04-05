import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
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

  hashStrong(value: string): Promise<string> {
    return argon2.hash(value, this.hashingOptions);
  }

  generateHexToken(size = 32): string {
    return randomBytes(size).toString('hex');
  }

  verifyStrong(hash: string, plainValue: string): Promise<boolean> {
    return argon2.verify(hash, plainValue);
  }

  hashToken(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  needsRehash(hash: string): boolean {
    return argon2.needsRehash(hash, {
      ...this.hashingOptions,
    });
  }
}
