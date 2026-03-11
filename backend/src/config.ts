import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  imap: {
    host: required("IMAP_HOST"),
    port: Number(process.env["IMAP_PORT"] ?? "993"),
    user: required("IMAP_USER"),
    password: required("IMAP_PASSWORD"),
  },

  aws: {
    region: required("AWS_REGION"),
    accessKeyId: required("AWS_ACCESS_KEY_ID"),
    secretAccessKey: required("AWS_SECRET_ACCESS_KEY"),
    s3Bucket: required("S3_BUCKET"),
    sqsQueueUrl: required("SQS_QUEUE_URL"),
    dynamoTableName: required("DYNAMODB_TABLE"),
  },

  ses: {
    senderEmail: required("SES_SENDER_EMAIL"),
    adminEmail: required("ADMIN_EMAIL"),
  },

  openRouter: {
    apiKey: required("OPENROUTER_API_KEY"),
    baseUrl: "https://openrouter.ai/api/v1",
    model: process.env["OPENROUTER_MODEL"] ?? "google/gemini-2.0-flash-001",
  },
} as const;

export type Config = typeof config;
