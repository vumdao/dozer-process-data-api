import { App } from 'cdk8s';
import { DozerJobProvisioner } from './karpenter-provisioner/dozer-job-provisoner';
import { DozerKedaJob } from './keda/dozer-job';
import { DozerJobSA } from './serviceAccount/processor-job-sa';

// Keda
const keda = new App({
  outputFileExtension: '.yaml',
  outdir: 'dist/keda',
});
new DozerKedaJob(keda, 'dozer-job');
keda.synth();

// Karpenter provisioner
const provisioner = new App({
  outputFileExtension: '.yaml',
  outdir: 'dist/provisioner',
});
new DozerJobProvisioner(provisioner, 'dozer-job');
provisioner.synth();

// ServiceAccount
const sa = new App({
  outputFileExtension: '.yaml',
  outdir: 'dist/sa',
});
new DozerJobSA(sa, 'dozer-job-sa');
sa.synth();