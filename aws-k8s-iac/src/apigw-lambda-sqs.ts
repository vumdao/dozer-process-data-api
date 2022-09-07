import { HttpApi, HttpMethod } from "@aws-cdk/aws-apigatewayv2-alpha";
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { PythonFunction } from "@aws-cdk/aws-lambda-python-alpha";
import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Queue, QueueEncryption } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { join } from "path";
import { EnvironmentConfig } from "./shared/environment";

export class DozerProcessDataStacks extends Stack {
  sqsArn: string;

  constructor(scope: Construct, id: string, reg: EnvironmentConfig, props: StackProps) {
    super(scope, id, props);

    const prefix = `${reg.pattern}-${reg.stage}-dozer`;

    const sqsDlq = new Queue(this, 'DLQ', {
      queueName: `${prefix}-dlq.fifo`,
      fifo: true,
      encryption: QueueEncryption.KMS_MANAGED
    });

    const sqs = new Queue(this, 'DozerQueue', {
      queueName: `${prefix}-sqs.fifo`,
      deadLetterQueue: {queue: sqsDlq, maxReceiveCount: 1},
      encryption: QueueEncryption.KMS_MANAGED,
      fifo: true,
      contentBasedDeduplication: true
    });

    this.sqsArn = sqs.queueArn;

    const sqsHandler = new PythonFunction(this, 'PythonFunc', {
      description: 'Hanlder to create SQS message or get statistic',
      logRetention: RetentionDays.ONE_WEEK,
      functionName: `${prefix}-api-handler`,
      runtime: Runtime.PYTHON_3_9,
      entry: join(__dirname, 'lambda-handler'),
      currentVersionOptions: {removalPolicy: RemovalPolicy.DESTROY},
      environment: {
        DOZER_SQS_URL: sqs.queueUrl
      }
    });
    sqs.grantSendMessages(sqsHandler);

    const apigw = new HttpApi(this, 'LambdaHTTPAPI', {
      apiName: `${prefix}-process-data`,
    });
    apigw.addRoutes({
      path: '/jobs',
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration('postJob', sqsHandler)
    });

    apigw.addRoutes({
      path: '/jobs/stats',
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration('getStats', sqsHandler)
    });

    apigw.addRoutes({
      path: '/jobs/schedule',
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration('getStats', sqsHandler)
    });
  }
}