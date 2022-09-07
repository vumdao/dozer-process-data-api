import { Chart } from 'cdk8s';
import { Construct } from 'constructs';
import { ScaledJob } from '../imports/keda.sh';

export interface AwsResources {
  sqlUrl: string;
  ddbTableName: string;
  region: string;
}
export class DozerKedaJob extends Chart {
  constructor(scope: Construct, name: string, props: AwsResources) {
    super(scope, name);

    new ScaledJob(this, 'KedaDozerJob', {
      metadata: {
        name: name,
      },
      spec: {
        jobTargetRef: {
          template: {
            spec: {
              containers: [{
                name: 'dozer-process-job',
                image: '107858015234.dkr.ecr.ap-southeast-1.amazonaws.com/dozer/process-job:latest',
                env: [
                  { name: 'AWS_SQS_URL', value: props.sqlUrl },
                  { name: 'AWS_DDB_TABLE', value: props.ddbTableName },
                ],
              }],
              restartPolicy: 'Never',
              tolerations: [{
                effect: 'NoSchedule',
                key: 'workload',
                operator: 'Equal',
                value: 'tets',
              }],
              affinity: {
                nodeAffinity: {
                  requiredDuringSchedulingIgnoredDuringExecution: {
                    nodeSelectorTerms: [{
                      matchExpressions: [{
                        key: 'deployment',
                        operator: 'In',
                        values: ['dozer-job'],
                      }],
                    }],
                  },
                },
              },
              serviceAccountName: 'dozer-job',
            },
          },
          backoffLimit: 2,
        },
        pollingInterval: 10,
        maxReplicaCount: 4,
        minReplicaCount: 0,
        successfulJobsHistoryLimit: 3,
        failedJobsHistoryLimit: 2,
        triggers: [{
          type: 'aws-sqs-queue',
          metadata: {
            queueURL: props.sqlUrl,
            queueLength: '1',
            awsRegion: props.region,
            scaleOnInFlight: 'false',
            identityOwner: 'operator',
          },
        }],
      },
    });
  }
}