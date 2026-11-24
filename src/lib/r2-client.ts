import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim() ?? '';
  const bucket = process.env.R2_BUCKET_NAME?.trim() ?? '';
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() ?? '';
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() ?? '';
  const customEndpoint = process.env.S3_ENDPOINT?.trim() ?? '';
  const region = process.env.S3_REGION?.trim() || 'auto';

  const endpoint =
    customEndpoint || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');

  return {
    accountId,
    bucket,
    accessKeyId,
    secretAccessKey,
    endpoint,
    region,
  };
}

export function isR2Configured(): boolean {
  const cfg = getR2Config();
  return Boolean(cfg.endpoint && cfg.bucket && cfg.accessKeyId && cfg.secretAccessKey);
}

function createR2Client(): { client: S3Client; bucket: string } {
  const cfg = getR2Config();
  if (!cfg.endpoint || !cfg.bucket || !cfg.accessKeyId || !cfg.secretAccessKey) {
    throw new Error('Cloudflare R2 / S3 credentials are not configured');
  }

  const client = new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });

  return { client, bucket: cfg.bucket };
}

export async function createPresignedPutUrl(
  key: string,
  contentType: string
): Promise<string> {
  const { client, bucket } = createR2Client();
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, cmd, { expiresIn: 900 });
}

export async function createPresignedGetUrl(key: string): Promise<string> {
  const { client, bucket } = createR2Client();
  const cmd = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return getSignedUrl(client, cmd, { expiresIn: 3600 });
}
