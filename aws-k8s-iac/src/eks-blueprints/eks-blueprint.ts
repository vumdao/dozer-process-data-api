import {
  AsgClusterProvider, AwsNodeTerminationHandlerAddOn, Mode, PlatformTeam, VpcCniAddOn,
  ClusterAddOn, EbsCsiDriverAddOn, KarpenterAddOn, KedaAddOn, MetricsServerAddOn
} from '@aws-quickstart/eks-blueprints';
import { InstanceClass, InstanceSize, InstanceType } from 'aws-cdk-lib/aws-ec2';
import { KubernetesVersion, MachineImageType } from 'aws-cdk-lib/aws-eks';
import { ArnPrincipal } from 'aws-cdk-lib/aws-iam';
import { CDK_DEFAULT_ACCOUNT } from '../shared/configs';
import { EnvironmentConfig } from '../shared/environment';
import { PlatformUsers } from './platform-user';

export function EksAddOns(): Array<ClusterAddOn> {
  const AddOns: Array<ClusterAddOn> = [
    new VpcCniAddOn,
    new MetricsServerAddOn,
    new AwsNodeTerminationHandlerAddOn({
      mode: Mode.IMDS,
    }),
    new KarpenterAddOn({
      version: '0.16.3',
      release: 'karpenter',
    }),
    new EbsCsiDriverAddOn
  ];

  AddOns.push(
    new KedaAddOn({
      version: "2.8.2",
      podSecurityContextFsGroup: 1001,
      securityContextRunAsGroup: 1001,
      securityContextRunAsUser: 1001,
      irsaRoles: ["CloudWatchFullAccess", "AmazonSQSFullAccess"]
    })
  );
  return AddOns
}

export const PlatformAdmin = new PlatformTeam({
  name: 'platform-admin',
  users: PlatformUsers.map((user) => new ArnPrincipal(`arn:aws:iam::${CDK_DEFAULT_ACCOUNT}:user/${user}`)),
});

export function EksComponents(env: EnvironmentConfig) {
  const AsgProvider = new AsgClusterProvider({
    version: KubernetesVersion.V1_23,
    id: `${env.pattern}-${env.stage}-ASG`,
    autoScalingGroupName: `${env.pattern}-${env.stage}-ASG`,
    minSize: 2,
    maxSize: 2,
    machineImageType: MachineImageType.BOTTLEROCKET,
    instanceType: InstanceType.of(InstanceClass.T3A, InstanceSize.MEDIUM),
    spotPrice: '0.0468'
  });
  return AsgProvider;
}