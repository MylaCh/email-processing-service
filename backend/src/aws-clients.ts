import { S3Client } from "@aws-sdk/client-s3";
import { SQSClient } from "@aws-sdk/client-sqs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { SESClient } from "@aws-sdk/client-ses";
import { config } from "./config";

const credentials = {
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
};

export const s3 = new S3Client({
  region: config.aws.region,
  credentials,
});

export const sqs = new SQSClient({
  region: config.aws.region,
  credentials,
});

const dynamoClient = new DynamoDBClient({
  region: config.aws.region,
  credentials,
});

export const dynamo = DynamoDBDocumentClient.from(dynamoClient);

export const ses = new SESClient({
  region: config.aws.region,
  credentials,
});
