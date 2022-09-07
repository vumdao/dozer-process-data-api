import { Chart } from 'cdk8s';
import { ServiceAccount } from 'cdk8s-plus-24';
import { Construct } from 'constructs';

export interface AwsProps {
  roleArn: string;
}

export class DozerJobSA extends Chart {
  constructor(scope: Construct, name: string, props: AwsProps) {
    super(scope, name);

    new ServiceAccount(this, 'DozerJobSA', {
      metadata: {
        name: 'dozer-job',
        labels: { app: 'dozer-job' },
        annotations: {
          'eks.amazonaws.com/role-arn': props.roleArn,
        },
      },
    });
  }
}