import { cdk8s } from 'projen';
const project = new cdk8s.Cdk8sTypeScriptApp({
  cdk8sVersion: '2.3.33',
  defaultReleaseBranch: 'master',
  name: 'cdk8s',
  projenrcTs: true,
  deps: ['env-var', 'cdk8s-plus-24@2.0.0-rc.99', 'dotenv', 'aws-cdk-lib', 'child_process'],

  // deps: [],                /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
});

project.gitignore.addPatterns('.env');
project.gitignore.addPatterns('*.yaml');

project.synth();