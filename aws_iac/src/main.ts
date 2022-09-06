import { App, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DozerProcessDataStacks } from './apigw-lambda-sqs';
import { DozerEcrStack } from './ecr';
import { buildCluster } from './eks-blueprints/builder';
import { DozerIRSAStack } from './irsa';
import { EnvironmentConfig, devEnv } from './shared/environment';


const app = new App();

export class EksClusterStack extends Stack {
  constructor(scope: Construct, id: string, reg: EnvironmentConfig, props: StackProps) {
    super(scope, id, props);

    buildCluster(this, reg).then((_cluster) => {
      const dozer = new DozerProcessDataStacks(this, `${reg.pattern}-DozerProcessData`, reg, {
        description: 'Dozer Stacks',
        env: reg
      });

      new DozerIRSAStack(this, `${reg.pattern}-DozerIRSA`, reg, {
        description: 'Dozer IRSA',
        env: reg,
        iamOidcArn: _cluster.openIdConnectProvider.openIdConnectProviderArn,
        oidcIssuer: _cluster.openIdConnectProvider.openIdConnectProviderIssuer,
        sqsArn: dozer.sqsArn
      });

      new DozerEcrStack(this, `${reg.pattern}-DozerECR`, {
        description: 'Dozer ECR',
        env: reg
      })
    });
  }
}

new EksClusterStack(app, 'DevEksCluster', devEnv, {
  description: 'Dev EKS cluster',
  env: devEnv,
});
