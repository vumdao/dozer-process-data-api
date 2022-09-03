import { awscdk } from 'projen';
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.40.0',
  defaultReleaseBranch: 'main',
  name: 'dozer-process-data-api',
  projenrcTs: true,
  deps: [
    'env-var', 'dotenv',
    '@aws-quickstart/eks-blueprints@1.2.0', '@aws-cdk/aws-apigatewayv2-alpha', '@aws-cdk/aws-lambda-python-alpha',
    '@aws-cdk/aws-apigatewayv2-integrations-alpha'
  ]

  // deps: [],                /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
});

const dotEnvFile = '.env'
project.gitignore.addPatterns(dotEnvFile)
project.gitignore.addPatterns('node_modules')

project.synth();