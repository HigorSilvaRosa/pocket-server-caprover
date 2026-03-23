# -----------------------------------------------------------------------------
# IMAGEM BASE
# Node 22 Bookworm Slim: leve, glibc disponível, Node pré-instalado.
# -----------------------------------------------------------------------------
FROM node:22-bookworm-slim

# -----------------------------------------------------------------------------
# 1. DEPENDÊNCIAS DO SISTEMA
# git, curl, ca-certificates, openssh-client: para o agente e o instalador.
# coreutils: garante 'timeout' disponível.
# python3: exigido por alguns scripts de build de pacotes nativos npm.
# -----------------------------------------------------------------------------
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        git curl ca-certificates openssh-client coreutils python3 && \
    rm -rf /var/lib/apt/lists/*

# -----------------------------------------------------------------------------
# 2. INSTALAÇÃO DO POCKET SERVER
# a) Baixa o script oficial.
# b) Corrige o bug do mktemp (XXXXXX obrigatório no Linux).
# c) Roda sob timeout de 30s para evitar travar o build (o script tenta iniciar
#    o servidor; timeout o encerra antes). '|| true' ignora o exit code.
# d) Verifica que o binário foi instalado com sucesso.
# e) Patch genérico do cli.js: qualquer chamada .repeat(N) vira
#    .repeat(Math.max(0,N)), prevenindo RangeError em ambientes não-TTY.
# -----------------------------------------------------------------------------
RUN echo "Instalando Pocket Server..." && \
    curl -fsSL https://www.pocket-agent.xyz/install -o install.sh && \
    sed -i 's/pocket-server.tar.gz/pocket-server.XXXXXX.tar.gz/g' install.sh && \
    timeout 30 bash install.sh || true && \
    test -f /root/.pocket-server/bin/pocket-server && \
    rm install.sh && \
    find /root/.pocket-server/releases/ -name "cli.js" \
        -exec sed -i 's/\.repeat(\([^)]*\))/\.repeat(Math.max(0,\1))/g' {} +

# -----------------------------------------------------------------------------
# 3. VARIÁVEIS DE AMBIENTE E PATH
# -----------------------------------------------------------------------------
ENV GIT_USER_NAME="Pocket Agent" \
    GIT_USER_EMAIL="agent@pocket.server" \
    PATH=$PATH:/root/.pocket-server/bin

# -----------------------------------------------------------------------------
# 4. WORKSPACE BASE
# -----------------------------------------------------------------------------
WORKDIR /app

# -----------------------------------------------------------------------------
# 5. BUILD DO FRONTEND
# Copiamos o frontend primeiro para aproveitar o cache de layers do Docker.
# O artefato final (dist/) fica em /app/frontend/dist, servido pelo Fastify.
# -----------------------------------------------------------------------------
COPY frontend/package.json frontend/package-lock.json* ./frontend/
RUN cd frontend && npm install

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# -----------------------------------------------------------------------------
# 6. BACKEND (ORQUESTRADOR)
# -----------------------------------------------------------------------------
COPY package.json package-lock.json* tsconfig.json ./
RUN npm install

COPY server.ts ./

# Workspace vazio para que o pocket-server tenha onde operar
RUN mkdir -p /app/workspace

# -----------------------------------------------------------------------------
# 7. PORTAS
# 3000: Pocket Server (nativo)
# 3001: Orquestrador Fastify + UI React
# -----------------------------------------------------------------------------
EXPOSE 3000
EXPOSE 3001

# -----------------------------------------------------------------------------
# 8. CMD DE INICIALIZAÇÃO
# Configura git e inicia o Fastify (que sobe o pocket-server como child process)
# -----------------------------------------------------------------------------
CMD ["/bin/bash", "-c", "\
    git config --global user.name \"$GIT_USER_NAME\" && \
    git config --global user.email \"$GIT_USER_EMAIL\" && \
    if [ -n \"$GITHUB_TOKEN\" ]; then \
        git config --global url.\"https://${GITHUB_TOKEN}@github.com/\".insteadOf \"https://github.com/\"; \
    fi; \
    echo 'Iniciando Sidecar Orchestrator...'; \
    exec npm start \
    "]