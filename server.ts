import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

const fastify = Fastify({ logger: true });

// ---------------------------------------------------------------------------
// Cross-Origin & Static Files
// ---------------------------------------------------------------------------
fastify.register(fastifyCors, { origin: '*' });

fastify.register(fastifyStatic, {
  root: path.resolve(__dirname, 'frontend', 'dist'),
  prefix: '/',
});

// ---------------------------------------------------------------------------
// Process management
// ---------------------------------------------------------------------------
let currentProcess: ChildProcess | null = null;
let pairingProcess: ChildProcess | null = null;

function startPocketServer() {
  if (currentProcess && !currentProcess.killed) {
    currentProcess.kill();
  }
  console.log('Starting standard pocket-server on port 3000...');
  currentProcess = spawn('pocket-server', ['start'], {
    cwd: process.env.POCKET_WORKSPACE ?? '/app/workspace',
    stdio: 'inherit',
    env: process.env,
  });
  currentProcess.on('error', (err) => {
    // pocket-server not installed locally — expected in dev; will work inside Docker.
    console.warn(`[pocket-server] Could not spawn: ${err.message}`);
  });
  currentProcess.on('close', (code) => {
    console.log(`Standard pocket-server exited with code ${code}`);
  });
}

startPocketServer();

// ---------------------------------------------------------------------------
// POST /api/pair
// ---------------------------------------------------------------------------
fastify.post('/api/pair', async (request, reply) => {
  const apiKey = request.headers['x-api-key'] as string | undefined;
  const serverApiKey = process.env.API_KEY;

  if (!serverApiKey || apiKey !== serverApiKey) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  if (pairingProcess) {
    return reply.status(429).send({ error: 'A pairing process is already running' });
  }

  // Kill standard server to free up resources for pairing
  if (currentProcess && !currentProcess.killed) {
    request.log.info('Killing current pocket-server to free up port/network for pairing...');
    currentProcess.kill();
    currentProcess = null;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  request.log.info('Starting pocket-server pair --remote...');

  pairingProcess = spawn('pocket-server', ['pair', '--remote'], {
    cwd: process.env.POCKET_WORKSPACE ?? '/app/workspace',
    env: {
      ...process.env,
      COLUMNS: '132',
      LINES: '24',
    },
  });

  pairingProcess.on('error', (err) => {
    request.log.warn(`[pair] Could not spawn: ${err.message}`);
    pairingProcess = null;
    startPocketServer();
  });

  return new Promise((resolve) => {
    let responded = false;
    let buffer = '';

    const tryRespond = (pin: string, token: string) => {
      if (responded) return;
      responded = true;
      request.log.info(`Captured PIN: ${pin} / Token: ${token}`);
      resolve(reply.send({ success: true, pin, token }));
      // Keep pairingProcess alive for 60s so pocket-server can accept the request
    };

    pairingProcess!.stdout?.on('data', (data: Buffer) => {
      buffer += data.toString();
      request.log.info(`[pair stdout]: ${data.toString().trim()}`);

      const pinMatch = buffer.match(/PIN Code:\s*(\d{6})/);
      const tokenMatch = buffer.match(/Pairing Token:\s*([a-zA-Z0-9_-]+)/);

      if (pinMatch && tokenMatch) {
        tryRespond(pinMatch[1], tokenMatch[1]);
      }
    });

    pairingProcess!.stderr?.on('data', (data: Buffer) => {
      request.log.warn(`[pair stderr]: ${data.toString().trim()}`);
    });

    pairingProcess!.on('close', (code) => {
      request.log.info(`Pairing process closed with code ${code}`);
      pairingProcess = null;

      if (!responded) {
        responded = true;
        resolve(
          reply.status(500).send({ error: 'Failed to capture pairing credentials from pocket-server output' }),
        );
      }

      // Revive standard server after pairing window closes
      startPocketServer();
    });
  });
});

// ---------------------------------------------------------------------------
// SPA fallback — serve index.html for any unknown route
// ---------------------------------------------------------------------------
fastify.setNotFoundHandler((_request, reply) => {
  // sendFile is added to FastifyReply by @fastify/static at runtime
  (reply as any).sendFile('index.html');
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    console.log('Sidecar Orchestrator listening on port 3001');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
