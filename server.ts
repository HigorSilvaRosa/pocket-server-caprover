import Fastify from 'fastify';
import { spawn, ChildProcess } from 'child_process';

const fastify = Fastify({ logger: true });

let currentProcess: ChildProcess | null = null;
let pairingProcess: ChildProcess | null = null;

// Helper to clean ANSI codes
function stripAnsi(str: string): string {
  return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}

function startPocketServer() {
  if (currentProcess && !currentProcess.killed) {
    currentProcess.kill();
  }
  console.log('Starting standard pocket-server on port 3000...');
  currentProcess = spawn('pocket-server', ['start'], { stdio: 'inherit', env: process.env });
  
  currentProcess.on('close', (code) => {
    console.log(`Standard pocket-server exited with code ${code}`);
  });
}

// Start standard pocket-server initially
startPocketServer();

fastify.post('/api/pair', async (request, reply) => {
  const apiKey = request.headers['x-api-key'];
  if (!process.env.API_KEY || apiKey !== process.env.API_KEY) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  const body = request.body as { deviceName?: string };
  if (!body || !body.deviceName) {
    return reply.status(400).send({ error: 'deviceName is required in body' });
  }

  if (pairingProcess) {
    return reply.status(429).send({ error: 'A pairing process is already running' });
  }

  // Liberar a rede: matar o processo principal
  if (currentProcess && !currentProcess.killed) {
    console.log('Killing current pocket-server to free up port/network for pairing...');
    currentProcess.kill();
    currentProcess = null;
    // Pequena pausa para garantir que a porta/interface foi liberada
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(`Starting pairing process for device: ${body.deviceName}`);
  
  // Iniciar o pair
  pairingProcess = spawn('pocket-server', ['pair', '--remote'], {
    env: { ...process.env, COLUMNS: '132', LINES: '24' }
  });

  return new Promise((resolve) => {
    let pin: string | null = null;
    let token: string | null = null;
    let responded = false;

    pairingProcess?.stdout?.on('data', (data: Buffer) => {
      const outputRaw = data.toString();
      const output = stripAnsi(outputRaw);
      console.log(`[pocket-server pair raw]: ${outputRaw}`);

      // Usando match para PIN (6 dígitos) e token
      const pinMatch = output.match(/PIN(?: Code)?.*?(\d{6})/i) || output.match(/(\d{6})/);
      const tokenMatch = output.match(/Token.*?([a-zA-Z0-9_-]{15,})/i) || output.match(/([a-zA-Z0-9_-]{20,})/);

      if (!pin && pinMatch) pin = pinMatch[1];
      if (!token && tokenMatch) token = tokenMatch[1];

      // Assim que capturar ambos, responder JSON 
      if (pin && token && !responded) {
        responded = true;
        console.log(`Captured PIN: ${pin}, Token: ${token}`);
        resolve(reply.send({ success: true, deviceName: body.deviceName, pin, token, expiresIn: "60s" }));
      }
    });

    pairingProcess?.stderr?.on('data', (data: Buffer) => {
        console.error(`[pocket-server pair stderr]: ${data.toString()}`);
    });

    // O processo pair se encerra sozinho após 60s
    pairingProcess?.on('close', (code) => {
      console.log(`Pairing process closed with code ${code}`);
      pairingProcess = null;
      
      if (!responded) {
        responded = true;
        resolve(reply.status(500).send({ error: 'Failed to capture credentials within time limit' }));
      }
      
      // Reviver o pocket-server start silenciosamente no fundo
      startPocketServer();
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
