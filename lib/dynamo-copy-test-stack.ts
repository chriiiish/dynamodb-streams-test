import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as lambda from '@aws-cdk/aws-lambda';
import * as sqs from '@aws-cdk/aws-sqs';
import * as path from 'path';
import * as eventsources from '@aws-cdk/aws-lambda-event-sources';
import * as s3 from '@aws-cdk/aws-s3';
import * as iam from '@aws-cdk/aws-iam';
import { PolicyDocument, PolicyStatement, ServicePrincipal } from '@aws-cdk/aws-iam';
import { BucketEncryption, BucketNotificationDestinationType, EventType } from '@aws-cdk/aws-s3';
import * as s3n from '@aws-cdk/aws-s3-notifications';

export class DynamoCopyTestStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const table = new dynamodb.Table(this, 'original-table', {
      partitionKey: { name: 'customer', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'userid', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_IMAGE,
      pointInTimeRecovery: true
    });

    const deadletter = new sqs.Queue(this, 'deadletter-queue');

    const recordCopyLf = new lambda.Function(this, 'processing-function', {
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambda-handlers')),
      handler: 'processing.handler'
    });
    recordCopyLf.addEventSource(new eventsources.DynamoEventSource(table, {
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
      batchSize: 5,
      bisectBatchOnError: true,
      onFailure: new eventsources.SqsDlq(deadletter),
      retryAttempts: 10
    }));

    const dataCleanLf = new lambda.Function(this, 'data-clean-function', {
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambda-handlers')),
      handler: 'data-clean.handler'
    });
    
    const exportBucket = new s3.Bucket(this, 'backup-bucket');
    exportBucket.addEventNotification(EventType.OBJECT_CREATED, new s3n.LambdaDestination(dataCleanLf), { suffix: 'manifest-files.json' });

    const exportLr = new iam.Role(this, 'export-role', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com')
    });
    const exportLf = new lambda.Function(this, 'export-function', {
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambda-handlers')),
      handler: 'export.handler',
      environment: {
        S3_BUCKET_NAME: exportBucket.bucketName,
        DYNAMODB_TABLE_ARN: table.tableArn
      },
      role: exportLr
    });
    exportBucket.grantReadWrite(exportLr);
    table.grantFullAccess(exportLr);
  };
}
