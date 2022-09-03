import { CfnJson, Stack, StackProps } from "aws-cdk-lib";
import { FederatedPrincipal, PolicyStatement, Role } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { DOZER_JOB_SA } from "./shared/constants";
import { EnvironmentConfig } from "./shared/environment";

export interface IRSAProps extends StackProps {
  iamOidcArn: string;
  sqsArn: string;
}

export class DozerIRSAStack extends Stack {
  constructor(scope: Construct, id: string, reg: EnvironmentConfig, props: IRSAProps) {
    super(scope, id, props);

    const prefix = `${reg.pattern}-${reg.stage}-dozer`;

    const _oidc = props.iamOidcArn.match(/[^\/]*$/g);
    const oidc = _oidc ? _oidc[0] : '';
    const oidcProvider = `oidc.eks.${reg.region}.amazonaws.com/id/${oidc}`;
    const oidcArn = props.iamOidcArn;

    const StringLike = new CfnJson(this, 'DozerJobSA', {
      value: {
        [`${oidcProvider}:sub`]: [
            `system:serviceaccount:kube-system:${DOZER_JOB_SA}`
          ],
        [`${oidcProvider}:aud`]: 'sts.amazonaws.com',
      },
    });

    const jobRole = new Role(this, `${prefix}-irsa`, {
      description: 'Dozer job role',
      roleName: `${prefix}-role`,
      assumedBy: new FederatedPrincipal(
        oidcArn,
        {
            StringLike: StringLike,
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