# -----------------------------------------------------------------------------
# 1. IMAGEM BASE
# -----------------------------------------------------------------------------
FROM node:22-bookworm-slim

# -----------------------------------------------------------------------------
# 2. DEPENDÊNCIAS DO SISTEMA
# - python3: Usaremos o módulo 'pty' do Python, que é o padrão ouro para 
#   emular terminais reais dentro de containers.
# -----------------------------------------------------------------------------
RUN apt-get update && \
    apt-get install -y --no-install-recommends git curl ca-certificates openssh-client coreutils python3 && \
    rm -rf /var/lib/apt/lists/*

# -----------------------------------------------------------------------------
# 3. INSTALAÇÃO E "VACINA" NO CÓDIGO (Patching)
# - Além de corrigir o mktemp, agora entramos no arquivo compilado da CLI e
#   aplicamos um patch no método '.repeat()'. 
#   Substituímos '.repeat(n)' por '.repeat(Math.max(0, n))'. 
#   Isso torna o erro de '-1' matematicamente impossível de acontecer.
# -----------------------------------------------------------------------------
RUN echo "Instalando e aplicando patch de segurança no código..." && \
    curl -fsSL https://www.pocket-agent.xyz/install -o install.sh && \
    sed -i 's/pocket-server.tar.gz/pocket-server.XXXXXX.tar.gz/g' install.sh && \
    timeout 30 bash install.sh || true && \
    # O PONTO CRUCIAL: Patcheando o arquivo JS para evitar o crash de -1
    find /root/.pocket-server/releases/ -name "cli.js" -exec sed -i 's/\.repeat(\([^)]*\))/\.repeat(Math.max(0,\1))/g' {} + && \
    test -f /root/.pocket-server/bin/pocket-server && \
    rm install.sh

# -----------------------------------------------------------------------------
# 4. VARIÁVEIS DE AMBIENTE
# -----------------------------------------------------------------------------
ENV GIT_USER_NAME="Pocket Agent" \
    GIT_USER_EMAIL="agent@pocket.server" \
    PATH=$PATH:/root/.pocket-server/bin \
    COLUMNS=80 \
    LINES=24 \
    TERM=xterm

WORKDIR /app
EXPOSE 3000

# -----------------------------------------------------------------------------
# 5. COMANDO DE INICIALIZAÇÃO (PTY EMULADO VIA PYTHON)
# - 'python3 -c ...': Abre um pseudo-terminal (PTY) real que engana o Node.js
#   perfeitamente. É muito mais eficiente que o comando 'script'.
# -----------------------------------------------------------------------------
CMD ["/bin/bash", "-c", "\
    git config --global user.name \"$GIT_USER_NAME\" && \
    git config --global user.email \"$GIT_USER_EMAIL\" && \
    if [ -n \"$GITHUB_TOKEN\" ]; then git config --global url.\"https://${GITHUB_TOKEN}@github.com/\".insteadOf \"https://github.com/\"; fi; \
    echo 'Iniciando pareamento com PTY emulado...'; \
    while true; do \
    python3 -c 'import pty; pty.spawn([\"pocket-server\", \"pair\", \"--remote\"])'; \
    echo 'Reiniciando em 5 segundos...'; \
    sleep 5; \
    done \
    "]