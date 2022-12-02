import { EksBlueprint } from "@aws-quickstart/eks-blueprints";
import { Cluster, KubernetesVersion } from "aws-cdk-lib/aws-eks";
import { Construct } from "constructs";
import { EnvironmentConfig } from "../shared/environment";
import { TagsProp } from "../shared/tagging";
import { EksAddOns, EksComponents, PlatformAdmin } from "./eks-blueprint";

/**
 * EKS Blueprints with AddOns
 */
export function buildCluster(scope: Construct, reg: EnvironmentConfig): Promise<Cluster> {
  return new Promise<Cluster>((resolve, _) => {
    let eksName = `${reg.pattern}-${reg.stage}-${reg.envTag}`;

    let appTeams: Array<any> = [];

    const AddOns = EksAddOns();

    const eksCluster = EksBlueprint.builder()
      .name(eksName)
      .account(reg.account)
      .region(reg.region)
      .addOns(...AddOns)
      .version(KubernetesVersion.V1_23)
      .teams(...appTeams, PlatformAdmin)
      .clusterProvider(EksComponents(reg))
      .build(scope, `${eksName}-eks-blueprint`, {
        description: "EKS Blueprints",
        env: {
            region: reg.region,
            account: reg.account
        },
        tags: TagsProp("eks-blueprints", reg)
      });

    resolve(eksCluster.getClusterInfo().cluster);
  });
}
