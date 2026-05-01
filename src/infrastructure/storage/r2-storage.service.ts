import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
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
  private client: S3Client | null = null;

  constructor(private readonly configService: ConfigService) {}

  private getClient(): S3Client {
    if (this.client) {
      return this.client;
    }

    const endpoint = this.configService.r2Endpoint;
    const bucketName = this.configService.r2BucketName;
    const accessKeyId = this.configService.r2AccessKeyId;
    const secretAccessKey = this.configService.r2SecretAccessKey;

    if (!endpoint || !bucketName || !accessKeyId || !secretAccessKey) {
      throw new InternalServerErrorException('R2 storage is not configured');
    }

    this.client = new S3Client({
      region: this.configService.r2Region,
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    return this.client;
  }

  private getBucketName(): string {
    const bucketName = this.configService.r2BucketName;

    if (!bucketName) {
      throw new InternalServerErrorException('R2 storage is not configured');
    }

    return bucketName;
  }

  async createPresignedUploadUrl(input: PresignedUploadInput): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.getBucketName(),
      Key: input.key,
      ContentType: input.contentType,
    });

    return getSignedUrl(this.getClient(), command, {
      expiresIn: this.configService.fileUploadPresignExpiresSeconds,
    });
  }

  async createPresignedDownloadUrl(
    input: PresignedDownloadInput,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.getBucketName(),
      Key: input.key,
      ResponseContentDisposition: this.buildContentDisposition(
        input.filename,
        input.disposition ?? 'inline',
      ),
    });

    return getSignedUrl(this.getClient(), command, {
      expiresIn: this.configService.fileDownloadPresignExpiresSeconds,
    });
  }

  async putObject(input: PutObjectInput): Promise<void> {
    await this.getClient().send(
      new PutObjectCommand({
        Bucket: this.getBucketName(),
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
      return await this.getClient().send(
        new HeadObjectCommand({
          Bucket: this.getBucketName(),
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
