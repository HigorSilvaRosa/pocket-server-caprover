import Fastify from 'fastify';
import { spawn, ChildProcess } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import crypto from 'crypto';
import os from 'os';
import path from 'path';

const fastify = Fastify({ logger: true });

// pocket-server writes pairing state here before rendering the display (which crashes in non-TTY)
const PAIRING_JSON = path.join(os.homedir(), '.pocket-server', 'data', 'runtime', 'pairing.json');

let currentProcess: ChildProcess | null = null;
let pairingProcess: ChildProcess | null = null;

function readPairingState(): { pairToken?: string; expiresAt?: string; active?: boolean } | null {
  try {
    if (!existsSync(PAIRING_JSON)) return null;
    return JSON.parse(readFileSync(PAIRING_JSON, 'utf8'));
  } catch {
    return null;
  }
}

function startPocketServer() {
  if (currentProcess && !currentProcess.killed) {
    currentProcess.kill();
  }
  console.log('Starting standard pocket-server on port 3000...');
  currentProcess = spawn('pocket-server', ['start'], { cwd: '/app/workspace', stdio: 'inherit', env: process.env });
  currentProcess.on('close', (code) => {
    console.log(`Standard pocket-server exited with code ${code}`);
  });
}

startPocketServer();

fastify.post('/api/pair', async (request, reply) => {
  const authHeader = request.headers['authorization'];
  let apiKey = authHeader;

  const serverApiKey = process.env.API_KEY;
  if (apiKey) apiKey = apiKey.replace(/^Bearer\s+/i, '').trim();

  if (!serverApiKey || apiKey !== serverApiKey) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  const body = request.body as { deviceName?: string };
  if (!body || !body.deviceName) {
    return reply.status(400).send({ error: 'deviceName is required in body' });
  }

  if (pairingProcess) {
    return reply.status(429).send({ error: 'A pairing process is already running' });
  }

  if (currentProcess && !currentProcess.killed) {
    request.log.info('Killing current pocket-server to free up port/network for pairing...');
    currentProcess.kill();
    currentProcess = null;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Generate PIN ourselves so we always know it, regardless of CLI crash timing.
  // pocket-server accepts --pin to use our pre-generated value and writes it (hashed)
  // to pairing.json along with pairToken, before attempting to render the box (which
  // crashes in non-TTY environments). We read pairToken from the JSON after close.
  const pin = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  request.log.info(`Starting pairing process for device: ${body.deviceName}, PIN: ${pin}`);

  pairingProcess = spawn('pocket-server', ['pair', '--remote', '--pin', pin], {
    cwd: '/app/workspace',
    env: process.env
  });

  return new Promise((resolve) => {
    let responded = false;

    pairingProcess?.stdout?.on('data', (data: Buffer) => {
      request.log.info(`[pair stdout]: ${data.toString()}`);
    });

    pairingProcess?.stderr?.on('data', (data: Buffer) => {
      request.log.warn(`[pair stderr]: ${data.toString()}`);
    });

    // Execution order in pocket-server pair --remote:
    //   1. startPairingWindow() → writes pin (hashed) + pairToken to pairing.json ✓
    //   2. createPairingDisplay() → crashes with RangeError (box rendering in non-TTY)
    //
    // We own the PIN (generated above) and we read pairToken from the JSON after close.
    pairingProcess?.on('close', (code) => {
      request.log.info(`Pairing process closed with code ${code}`);
      pairingProcess = null;

      if (!responded) {
        responded = true;
        const state = readPairingState();
        request.log.info(`Pairing JSON state: ${JSON.stringify(state)}`);

        if (state?.active && state.pairToken) {
          resolve(reply.send({
            success: true,
            deviceName: body.deviceName,
            pin,
            token: state.pairToken,
            expiresAt: state.expiresAt,
          }));
        } else {
          resolve(reply.status(500).send({
            error: 'Failed to start pairing session',
            detail: { stateActive: state?.active, hasPairToken: !!state?.pairToken }
          }));
        }

        // Restart the standard server in the background
        startPocketServer();
      }
    });
  });
});

const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    console.log('Sidecar Orchestrator Fastify API listening on port 3001');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
