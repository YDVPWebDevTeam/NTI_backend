import { Injectable, NotFoundException } from '@nestjs/common';
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type HeadObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '../config';

export type PresignedUploadInput = {
  key: string;
  contentType: string;
  contentLength: number;
  metadata?: Record<string, string>;
};

export type PresignedDownloadInput = {
  key: string;
  filename: string;
  disposition?: 'inline' | 'attachment';
};

export type PutObjectInput = {
  key: string;
  body: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
};

@Injectable()
export class R2StorageService {
  private readonly client: S3Client;

  constructor(private readonly configService: ConfigService) {
    this.client = new S3Client({
      region: this.configService.r2Region,
      endpoint: this.configService.r2Endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.configService.r2AccessKeyId,
        secretAccessKey: this.configService.r2SecretAccessKey,
      },
    });
  }

  async createPresignedUploadUrl(input: PresignedUploadInput): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.configService.r2BucketName,
      Key: input.key,
      ContentType: input.contentType,
      ContentLength: input.contentLength,
      Metadata: input.metadata,
    });

    return getSignedUrl(this.client, command, {
      expiresIn: this.configService.fileUploadPresignExpiresSeconds,
    });
  }

  async createPresignedDownloadUrl(
    input: PresignedDownloadInput,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.configService.r2BucketName,
      Key: input.key,
      ResponseContentDisposition: this.buildContentDisposition(
        input.filename,
        input.disposition ?? 'inline',
      ),
    });

    return getSignedUrl(this.client, command, {
      expiresIn: this.configService.fileDownloadPresignExpiresSeconds,
    });
  }

  async putObject(input: PutObjectInput): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.configService.r2BucketName,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        ContentLength: input.body.length,
        Metadata: input.metadata,
      }),
    );
  }

  buildPublicUrl(key: string): string {
    const publicBaseUrl = this.configService.r2PublicBaseUrl;

    if (!publicBaseUrl) {
      throw new Error('R2 public base URL is not configured');
    }

    return `${publicBaseUrl.replace(/\/+$/, '')}/${key}`;
  }

  async headObjectOrThrow(key: string): Promise<HeadObjectCommandOutput> {
    try {
      return await this.client.send(
        new HeadObjectCommand({
          Bucket: this.configService.r2BucketName,
          Key: key,
        }),
      );
    } catch (error: unknown) {
      const errorCode =
        typeof error === 'object' && error !== null && 'name' in error
          ? String(error.name)
          : '';

      if (errorCode === 'NotFound' || errorCode === 'NoSuchKey') {
        throw new NotFoundException('File object was not found in storage');
      }

      throw error;
    }
  }

  private buildContentDisposition(
    filename: string,
    disposition: 'inline' | 'attachment',
  ): string {
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]+/g, '_');

    return `${disposition}; filename="${safeFilename}"`;
  }
}
