import { Chart } from 'cdk8s';
import { Construct } from 'constructs';
import { ScaledJob } from '../imports/keda.sh';
import { AWS_REGION, DOZER_SQS_URL } from './constants';

export class DozerKedaJob extends Chart {
  constructor(scope: Construct, name: string) {
    super(scope, name);

    new ScaledJob(this, 'KedaDailyStartStop', {
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
            queueURL: DOZER_SQS_URL,
            queueLength: '1',
            awsRegion: AWS_REGION,
            scaleOnInFlight: 'false',
            identityOwner: 'operator',
          },
        }],
      },
    });
  }
}