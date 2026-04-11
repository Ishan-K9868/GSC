import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { parse } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');
const containerName = 'sevasetu-backend-smoke';
const hostPort = '3012';

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: backendRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      ...options,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0 || options.allowFailure) {
        resolve({ stdout, stderr, code });
      } else {
        reject(new Error(`${command} ${args.join(' ')} failed with code ${code}\n${stderr || stdout}`));
      }
    });
  });
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const envPath = path.join(backendRoot, '.env');
  const envFile = await readFile(envPath, 'utf8');
  const env = parse(envFile);

  const dockerEnvEntries = {
    ...env,
    NODE_ENV: 'production',
    PORT: '3001',
    ALLOW_LOCAL_UPLOAD_FALLBACK: 'false',
    ALLOWED_ORIGINS: 'http://localhost:5173',
  };

  await run('docker', ['rm', '-f', containerName], { allowFailure: true });
  await run('docker', ['build', '-t', 'sevasetu-backend', '.']);

  const envArgs = Object.entries(dockerEnvEntries).flatMap(([key, value]) => ['-e', `${key}=${value}`]);

  await run('docker', [
    'run',
    '--rm',
    '-d',
    '-p', `${hostPort}:3001`,
    '--name', containerName,
    ...envArgs,
    'sevasetu-backend',
  ]);

  try {
    await wait(8000);

    const health = await fetch(`http://localhost:${hostPort}/health`).then((response) => response.json());
    const deps = await fetch(`http://localhost:${hostPort}/api/health/deps`).then((response) => response.json());
    const readyResponse = await fetch(`http://localhost:${hostPort}/api/health/ready`);
    const ready = await readyResponse.json();
    const devTokenResponse = await fetch(`http://localhost:${hostPort}/api/dashboard/workspace-summary`, {
      headers: {
        Authorization: 'Bearer dev-mock-token-for-prototype',
      },
    });
    const devTokenBody = await devTokenResponse.json();

    console.log(JSON.stringify({ health, deps, ready, devTokenBody }, null, 2));

    if (!readyResponse.ok) {
      throw new Error('Container readiness check failed.');
    }

    if (devTokenResponse.status !== 401) {
      throw new Error(`Expected production auth bypass to be disabled, but got ${devTokenResponse.status}.`);
    }
  } finally {
    const logs = await run('docker', ['logs', containerName], { allowFailure: true });
    if (logs.stdout || logs.stderr) {
      console.log('--- container logs ---');
      process.stdout.write(logs.stdout || logs.stderr);
    }
    await run('docker', ['rm', '-f', containerName], { allowFailure: true });
  }
}

await main();
