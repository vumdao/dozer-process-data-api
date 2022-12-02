import { awscdk } from 'projen';
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.53.0',
  defaultReleaseBranch: 'main',
  name: 'dozer-process-data-api',
  projenrcTs: true,
  deps: [
    'env-var', 'dotenv',
    '@aws-quickstart/eks-blueprints@1.4.1', '@aws-cdk/aws-apigatewayv2-alpha', '@aws-cdk/aws-lambda-python-alpha',
    '@aws-cdk/aws-apigatewayv2-integrations-alpha',
    'cdk8s', 'cdk8s-plus-25', 'dotenv', 'aws-cdk-lib', 'child_process'
  ]

  // deps: [],                /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
});

project.gitignore.addPatterns('node_modules')
project.gitignore.addPatterns('.env');
project.gitignore.addPatterns('*.yaml');

project.synth();