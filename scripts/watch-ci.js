// Follows a GitHub Actions run until it ends and prints each job's progress.
// Usage: node scripts/watch-ci.js <run id>   (needs the GitHub CLI, logged in)
// Lines starting with @@ drive the agent dashboard (each job is a sub-step); elsewhere they are just log lines.
const { execFileSync } = require('child_process');
const fs = require('fs');

const runId = process.argv[2];
if (!runId) {
  console.error('Usage: node scripts/watch-ci.js <run id>');
  process.exit(2);
}
const ghDefault = 'C:/Program Files/GitHub CLI/gh.exe';
const gh = fs.existsSync(ghDefault) ? ghDefault : 'gh';

// Rough times per job, so the dashboard can show time left.
const ESTIMATES = { check: '2m', android: '12m', ios: '25m', web: '3m', publish: '1m' };
const PLAIN = {
  check: 'Check version and run tests',
  android: 'Build Android app (APK)',
  ios: 'Build iPhone app (IPA)',
  web: 'Build web version',
  publish: 'Publish release with files',
};

const known = []; // job names in the order they were added as sub-steps
const shown = {}; // job name -> last state sent to the dashboard

function view() {
  const out = execFileSync(gh, ['run', 'view', runId, '--json', 'status,conclusion,jobs'], { encoding: 'utf8' });
  return JSON.parse(out);
}

function stateOf(job) {
  if (job.status !== 'completed') return job.status === 'in_progress' ? 'start' : 'todo';
  return ['success', 'skipped'].includes(job.conclusion) ? 'done' : 'fail';
}

function tick() {
  let run;
  try {
    run = view();
  } catch (err) {
    console.log('Could not read the run, trying again: ' + String(err.message).split('\n')[0]);
    return false;
  }
  const fresh = run.jobs.filter((j) => !known.includes(j.name));
  if (fresh.length) {
    known.push(...fresh.map((j) => j.name));
    const specs = fresh.map((j) => `${PLAIN[j.name] || j.name}${ESTIMATES[j.name] ? '~' + ESTIMATES[j.name] : ''}`);
    console.log('@@sub add ' + specs.join('|'));
  }
  for (const job of run.jobs) {
    const state = stateOf(job);
    if (state === 'todo' || shown[job.name] === state) continue;
    // A job that went from waiting straight to finished still needs "start" first.
    if (!shown[job.name] && state !== 'start') console.log(`@@sub start ${known.indexOf(job.name) + 1}`);
    console.log(`@@sub ${state} ${known.indexOf(job.name) + 1}`);
    console.log(`${job.name}: ${state === 'start' ? 'running' : job.conclusion}`);
    shown[job.name] = state;
  }
  const done = run.jobs.filter((j) => j.status === 'completed').length;
  const running = run.jobs
    .filter((j) => j.status === 'in_progress')
    .map((j) => {
      const step = (j.steps || []).find((s) => s.status === 'in_progress');
      return `${PLAIN[j.name] || j.name}${step ? ' (' + step.name + ')' : ''}`;
    });
  console.log(`@@now ${done} of ${run.jobs.length} jobs done${running.length ? '. Now: ' + running.join(', ') : ''}`);
  if (run.status === 'completed') {
    console.log('Run finished: ' + run.conclusion);
    process.exit(run.conclusion === 'success' ? 0 : 1);
  }
  return true;
}

tick();
setInterval(tick, 20000);
