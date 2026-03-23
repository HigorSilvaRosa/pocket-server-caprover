# -----------------------------------------------------------------------------
# 1. IMAGEM BASE
# -----------------------------------------------------------------------------
FROM node:22-bookworm-slim

# -----------------------------------------------------------------------------
# 2. DEPENDÊNCIAS DO SISTEMA
# Adicionamos 'coreutils' para garantir que o comando 'timeout' funcione.
# -----------------------------------------------------------------------------
RUN apt-get update && \
    apt-get install -y --no-install-recommends git curl ca-certificates openssh-client coreutils && \
    rm -rf /var/lib/apt/lists/*

# -----------------------------------------------------------------------------
# 3. INSTALAÇÃO COM VACINA CONTRA BUG
# - Corrigimos o 'mktemp' com os XXXXXX.
# - Usamos o 'timeout' para não travar o build quando o servidor tenta ligar.
# -----------------------------------------------------------------------------
RUN echo "Instalando Pocket Server..." && \
    curl -fsSL https://www.pocket-agent.xyz/install -o install.sh && \
    sed -i 's/pocket-server.tar.gz/pocket-server.XXXXXX.tar.gz/g' install.sh && \
    timeout 30 bash install.sh || true && \
    test -f /root/.pocket-server/bin/pocket-server && \
    rm install.sh

# -----------------------------------------------------------------------------
# 4. VARIÁVEIS DE AMBIENTE (O PULO DO GATO)
# Definimos COLUMNS e LINES aqui. Isso engana o código de desenho da caixa,
# fazendo-o acreditar que o terminal tem 80 caracteres de largura.
# Isso impede o erro 'RangeError: Invalid count value: -1'.
# -----------------------------------------------------------------------------
ENV GIT_USER_NAME="Pocket Agent" \
    GIT_USER_EMAIL="agent@pocket.server" \
    PATH=$PATH:/root/.pocket-server/bin \
    COLUMNS=80 \
    LINES=24 \
    TERM=xterm-256color

WORKDIR /app
EXPOSE 3000

# -----------------------------------------------------------------------------
# 5. COMANDO DE INICIALIZAÇÃO (MODO PAIR INFINITO)
# Forçamos a exportação das variáveis de terminal novamente dentro do shell
# antes de rodar o comando 'pair --remote'.
# -----------------------------------------------------------------------------
CMD ["/bin/sh", "-c", "\
    export COLUMNS=80 && \
    export LINES=24 && \
    git config --global user.name \"$GIT_USER_NAME\" && \
    git config --global user.email \"$GIT_USER_EMAIL\" && \
    if [ -n \"$GITHUB_TOKEN\" ]; then git config --global url.\"https://${GITHUB_TOKEN}@github.com/\".insteadOf \"https://github.com/\"; fi; \
    exec pocket-server pair --remote\
    "]