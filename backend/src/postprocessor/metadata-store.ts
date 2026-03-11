import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo } from "../aws-clients";
import { config } from "../config";
import type { EmailMetadata } from "../types";

export async function storeMetadata(metadata: EmailMetadata): Promise<void> {
  await dynamo.send(
    new PutCommand({
      TableName: config.aws.dynamoTableName,
      Item: metadata,
    })
  );
  console.log(`[DynamoDB] Stored metadata: pk=${metadata.pk} sk=${metadata.sk}`);
}
