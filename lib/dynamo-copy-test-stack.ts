import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as lambda from '@aws-cdk/aws-lambda';
import * as sqs from '@aws-cdk/aws-sqs';
import * as path from 'path';
import * as eventsources from '@aws-cdk/aws-lambda-event-sources';

export class DynamoCopyTestStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const table = new dynamodb.Table(this, 'original-table', {
      partitionKey: { name: 'customer', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'userid', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_IMAGE,
    });

    const deadletter = new sqs.Queue(this, 'deadletter-queue');

    const lambdafunction = new lambda.Function(this, 'processing-function', {
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambda-handler')),
      handler: 'index.handler'
    });
    lambdafunction.addEventSource(new eventsources.DynamoEventSource(table, {
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
      batchSize: 5,
      bisectBatchOnError: true,
      onFailure: new eventsources.SqsDlq(deadletter),
      retryAttempts: 10
    }))

  }
}
