import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Repository } from "aws-cdk-lib/aws-ecr";
import { Construct } from "constructs";

export class DozerEcrStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    new Repository(this, 'DozerEcr', {
      repositoryName: 'dozer/process-job',
      removalPolicy: RemovalPolicy.DESTROY
    })
  }
}