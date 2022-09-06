import { CfnJson, Stack, StackProps } from "aws-cdk-lib";
import { FederatedPrincipal, PolicyStatement, Role } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { DOZER_JOB_SA } from "./shared/constants";
import { EnvironmentConfig } from "./shared/environment";

export interface IRSAProps extends StackProps {
  iamOidcArn: string;
  oidcIssuer: string;
  sqsArn: string;
}

export class DozerIRSAStack extends Stack {
  constructor(scope: Construct, id: string, reg: EnvironmentConfig, props: IRSAProps) {
    super(scope, id, props);

    const prefix = `${reg.pattern}-${reg.stage}-dozer`;

    const StringEquals = new CfnJson(this, 'DozerJobSA', {
      value: {
        [`${props.oidcIssuer}:sub`]: [ `system:serviceaccount:default:${DOZER_JOB_SA}` ],
        [`${props.oidcIssuer}:aud`]: 'sts.amazonaws.com',
      },
    });

    const jobRole = new Role(this, `${prefix}-irsa`, {
      description: 'Dozer job role',
      roleName: `${prefix}-role`,
      assumedBy: new FederatedPrincipal(
        props.iamOidcArn,
        {
          StringEquals: StringEquals,
        },
        'sts:AssumeRoleWithWebIdentity'
      )
    });

    const sts = new PolicyStatement({
      sid: 'SQSConsumeMsg',
      actions: [
        'sqs:DeleteMessage',
        'sqs:ListQueues',
        'sqs:ChangeMessageVisibility',
        'sqs:ReceiveMessage'
      ],
      resources: [props.sqsArn]
    });
    jobRole.addToPolicy(sts);
  }
}