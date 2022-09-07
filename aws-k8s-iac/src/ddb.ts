import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

/**
 * Dynamodb table to store aggregation stats
 */
export class DozerDDBStack extends Stack {
  ddbTableName: string;
  ddbArn: string;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const table = new Table(this, 'DozerDDB', {
      tableName: 'dozer-aggregation-stats',
      partitionKey: {
        name: 'jobState',
        type: AttributeType.STRING
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY
    });
    this.ddbArn = table.tableArn;
    this.ddbTableName = table.tableName;
  }
}