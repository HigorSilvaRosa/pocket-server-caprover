# -----------------------------------------------------------------------------
# 1. IMAGEM BASE
# -----------------------------------------------------------------------------
FROM node:22-bookworm-slim

# -----------------------------------------------------------------------------
# 2. DEPENDÊNCIAS DO SISTEMA
# - util-linux: Contém o comando 'script', essencial para emular um terminal (TTY).
# -----------------------------------------------------------------------------
RUN apt-get update && \
    apt-get install -y --no-install-recommends git curl ca-certificates openssh-client coreutils util-linux && \
    rm -rf /var/lib/apt/lists/*

# -----------------------------------------------------------------------------
# 3. INSTALAÇÃO COM CORREÇÃO DE BUG (Workaround)
# -----------------------------------------------------------------------------
RUN echo "Instalando Pocket Server..." && \
    curl -fsSL https://www.pocket-agent.xyz/install -o install.sh && \
    sed -i 's/pocket-server.tar.gz/pocket-server.XXXXXX.tar.gz/g' install.sh && \
    timeout 30 bash install.sh || true && \
    test -f /root/.pocket-server/bin/pocket-server && \
    rm install.sh

# -----------------------------------------------------------------------------
# 4. VARIÁVEIS DE AMBIENTE
# - COLUMNS: Definimos uma largura larga (132) para evitar qualquer erro de cálculo.
# - TERM: Usamos 'xterm' para compatibilidade visual.
# -----------------------------------------------------------------------------
ENV GIT_USER_NAME="Pocket Agent" \
    GIT_USER_EMAIL="agent@pocket.server" \
    PATH=$PATH:/root/.pocket-server/bin \
    COLUMNS=132 \
    LINES=24 \
    TERM=xterm

WORKDIR /app
EXPOSE 3000

# -----------------------------------------------------------------------------
# 5. COMANDO DE INICIALIZAÇÃO (MODO INFINITO COM TTY EMULADO)
# - 'while true': Cria o loop infinito que você pediu.
# - 'script -q -c ... /dev/null': O GRANDE TRUQUE. Ele emula um terminal real.
#   Isso força o pocket-server a reconhecer a largura da tela e desenhar o PIN.
# - 'sleep 1': Evita que o loop sobrecarregue a CPU caso o comando falhe rápido.
# -----------------------------------------------------------------------------
CMD ["/bin/bash", "-c", "\
    git config --global user.name \"$GIT_USER_NAME\" && \
    git config --global user.email \"$GIT_USER_EMAIL\" && \
    if [ -n \"$GITHUB_TOKEN\" ]; then git config --global url.\"https://${GITHUB_TOKEN}@github.com/\".insteadOf \"https://github.com/\"; fi; \
    echo 'Iniciando loop de pareamento infinito...'; \
    while true; do \
    script -q -c 'pocket-server pair --remote' /dev/null; \
    echo 'Reiniciando janela de pareamento em 5 segundos...'; \
    sleep 5; \
    done \
    "]