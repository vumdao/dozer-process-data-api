import { Chart } from 'cdk8s';
import { ServiceAccount } from 'cdk8s-plus-24';
import { Construct } from 'constructs';

export class DozerJobSA extends Chart {
  constructor(scope: Construct, name: string) {
    super(scope, name);

    new ServiceAccount(this, 'DozerJobSA', {
      metadata: {
        name: 'dozer-job',
        labels: { app: 'dozer-job' },
        annotations: {
          'eks.amazonaws.com/role-arn': 'arn:aws:iam::107858015234:role/sin-d1-dozer-role',
        },
      },
    });
  }
}