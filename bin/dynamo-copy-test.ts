#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { DynamoCopyTestStack } from '../lib/dynamo-copy-test-stack';

const app = new cdk.App();
const stack = new DynamoCopyTestStack(app, 'DynamoCopyTestStack');
stack.tags.setTag('project', 'DynamoDbTest');
