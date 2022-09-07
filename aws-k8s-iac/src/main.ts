import { App, Stack, StackProps } from 'aws-cdk-lib';
import { DozerProcessDataStacks } from './apigw-lambda-sqs';
import { DozerDDBStack } from './ddb';
import { DozerEcrStack } from './ecr';
import { buildCluster } from './eks-blueprints/builder';
import { DozerIRSAStack } from './irsa';
import { EnvironmentConfig, devEnv } from './shared/environment';
import * as cdk8s from 'cdk8s';
import { DozerKedaJob } from './cdk8s/keda/dozer-job';
import { Construct } from 'constructs';
import { CDK_DEFAULT_REGION } from './shared/configs';
import { DozerJobProvisioner } from './cdk8s/karpenter-provisioner/dozer-job-provisoner';
import { DozerJobSA } from './cdk8s/serviceAccount/processor-job-sa';


const app = new App();

export class EksClusterStack extends Stack {
  constructor(scope: Construct, id: string, reg: EnvironmentConfig, props: StackProps) {
    super(scope, id, props);

    buildCluster(this, reg).then((_cluster) => {
      const dozer = new DozerProcessDataStacks(this, `${reg.pattern}-DozerProcessData`, reg, {
        description: 'Dozer Stacks',
        env: reg
      });

      const ddb = new DozerDDBStack(this, `${reg.pattern}-DozerDDB`, {
        description: 'Dozer DDB table',
        env: reg
      });

      new DozerIRSAStack(this, `${reg.pattern}-DozerIRSA`, reg, {
        description: 'Dozer IRSA',
        env: reg,
        iamOidcArn: _cluster.openIdConnectProvider.openIdConnectProviderArn,
        oidcIssuer: _cluster.openIdConnectProvider.openIdConnectProviderIssuer,
        sqsArn: dozer.sqsArn,
        ddbArn: ddb.ddbArn
      });

      new DozerEcrStack(this, `${reg.pattern}-DozerECR`, {
        description: 'Dozer ECR',
        env: reg
      });

      const keda = new cdk8s.App({
        outputFileExtension: '.yaml',
        outdir: 'dist/keda',
      });
      const dozerJob = new DozerKedaJob(keda, 'dozer-job',{
        sqlUrl: dozer.sqsArn,
        ddbTableArn: ddb.ddbArn,
        region: CDK_DEFAULT_REGION
      });
      keda.synth()

      const provisioner = new cdk8s.App({
        outputFileExtension: '.yaml',
        outdir: 'dist/provisioner',
      });
      const dozerProvisioner = new DozerJobProvisioner(provisioner, 'dozer-job', {
        clusterName: _cluster.clusterName
      });
      provisioner.synth()

      const sa = new cdk8s.App({
        outputFileExtension: '.yaml',
        outdir: 'dist/sa',
      });
      const dozerSa = new DozerJobSA(sa, 'dozer-job-sa', {
        roleArn: `${reg.pattern}-${reg.stage}-dozer-role`
      });
      sa.synth()

      _cluster.addCdk8sChart('DozerJob', dozerJob);
      _cluster.addCdk8sChart('DozerProvisioner', dozerProvisioner);
      _cluster.addCdk8sChart('DozerIRSA', dozerSa);
    });
  }
}

new EksClusterStack(app, 'DevEksCluster', devEnv, {
  description: 'Dev EKS cluster',
  env: devEnv,
});
