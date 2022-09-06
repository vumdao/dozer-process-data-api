import { Chart } from 'cdk8s';
import { Construct } from 'constructs';
import { Provisioner } from '../imports/karpenter.sh';
import { DEV_EKS_CLUSTER_NAME, DEV_KARPENTER_INSTANCE_PROFILE } from './provisioner-constants';

export class DozerJobProvisioner extends Chart {
  constructor(scope: Construct, name: string) {
    super(scope, name);

    new Provisioner(this, `${name}-provisioner`, {
      metadata: { name: name },
      spec: {
        limits: {
          resources: { cpu: { value: '4' } },
        },
        labels: { deployment: 'dozer-job' },
        provider: {
          instanceProfile: DEV_KARPENTER_INSTANCE_PROFILE,
          amiFamily: 'Bottlerocket',
          tags: {
            'eks/nodegroup-name': name,
            'eks/cluster-name': DEV_EKS_CLUSTER_NAME,
          },
          subnetSelector: { Name: `*${DEV_EKS_CLUSTER_NAME}*Private*` },
          securityGroupSelector: { [`kubernetes.io/cluster/${DEV_EKS_CLUSTER_NAME}`]: 'owned' },
        },
        requirements: [
          {
            key: 'karpenter.sh/capacity-type',
            operator: 'In',
            values: ['spot'],
          },
          {
            key: 'node.kubernetes.io/instance-type',
            operator: 'In',
            values: ['t3.small', 't3a.small', 't3.medium', 't3a.medium'],
          },
        ],
        taints: [{
          key: 'workload',
          value: 'tets',
          effect: 'NoSchedule',
        }],
        ttlSecondsAfterEmpty: 30,
      },
    });
  }
}
