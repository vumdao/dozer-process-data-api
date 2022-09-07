import { HttpApi, HttpMethod } from "@aws-cdk/aws-apigatewayv2-alpha";
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { PythonFunction } from "@aws-cdk/aws-lambda-python-alpha";
import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Queue, QueueEncryption } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { join } from "path";
import { EnvironmentConfig } from "./shared/environment";

export interface DozerProps extends StackProps {
  ddbTableName: string;
}

/**
 * Create HTTP API gateway with lambda integration
 * Create SQS and its DLQ, grant SQS permission for the lambda
 */
export class DozerProcessDataStacks extends Stack {
  sqsArn: string;
  sqsUrl: string;

  constructor(scope: Construct, id: string, reg: EnvironmentConfig, props: DozerProps) {
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
    this.sqsUrl = sqs.queueUrl;

    sqs.addToResourcePolicy(new PolicyStatement({
      sid: 'EventsToMyQueue',
      actions: ['sqs:SendMessage'],
      principals: [
        new ServicePrincipal('events.amazonaws.com')
      ],
      resources: [sqs.queueArn]
    }));

    /**
     * Lambda Role with permission
     * - Send/delete SQS messages
     * - Create eventbridge rule
     * - Read dynamodb table
     */
    const lambdaRole = new Role(this, 'DozerLambdaRole', {
      roleName: `${prefix}-sqs-event`,
      assumedBy: new ServicePrincipal('lambda.amazonaws.com')
    });
    sqs.grantSendMessages(lambdaRole);

    const eventSts = new PolicyStatement({
      sid: 'PutEvent',
      actions: [
        'events:PutRule',
        'events:PutTargets',
        'events:DescribeRule',
        'events:EnableRule',
        'events:ListRules',
        'events:PutEvents'
      ],
      resources: [`arn:aws:events:${this.region}:${this.account}:rule/*`]
    });

    const ddbSts = new PolicyStatement({
      sid: 'DDBRead',
      actions: [
        "dynamodb:DescribeTable",
        "dynamodb:List*",
        "dynamodb:Query",
        "dynamodb:Get*"
      ],
      resources: [`arn:aws:dynamodb:${this.region}:${this.account}:table/${props.ddbTableName}`]
    })

    lambdaRole.addToPolicy(eventSts);
    lambdaRole.addToPolicy(ddbSts);
    lambdaRole.addManagedPolicy({managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'})

    const sqsHandler = new PythonFunction(this, 'PythonFunc', {
      description: 'Hanlder to create SQS message or get statistic',
      logRetention: RetentionDays.ONE_WEEK,
      functionName: `${prefix}-api-handler`,
      runtime: Runtime.PYTHON_3_9,
      entry: join(__dirname, 'lambda-handler'),
      currentVersionOptions: {removalPolicy: RemovalPolicy.DESTROY},
      environment: {
        DOZER_SQS_URL: sqs.queueUrl,
        DOZER_SQS_ARN: sqs.queueArn,
        DOZER_DDB_TABLE_NAME: props.ddbTableName
      },
      role: lambdaRole
    });

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