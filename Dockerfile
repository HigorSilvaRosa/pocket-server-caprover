FROM node:22-bookworm-slim

# 1. Instala Git e os certificados SSL essenciais em uma única camada limpa
RUN apt-get update && \
    apt-get install -y --no-install-recommends git ca-certificates openssh-client && \
    rm -rf /var/lib/apt/lists/*

# 2. Agrupa todas as variáveis para gerar apenas 1 layer na imagem
ENV GIT_USER_NAME="Pocket Agent" \
    GIT_USER_EMAIL="agent@pocket.server" \
    NPM_CONFIG_PREFIX=/home/node/.npm-global \
    PATH=$PATH:/home/node/.npm-global/bin

WORKDIR /app
EXPOSE 3000

# 3. Script de inicialização com segurança SSL e NPM root permissions
CMD ["/bin/sh", "-c", "\
    git config --global user.name \"$GIT_USER_NAME\" && \
    git config --global user.email \"$GIT_USER_EMAIL\" && \
    if [ -n \"$GITHUB_TOKEN\" ]; then git config --global url.\"https://${GITHUB_TOKEN}@github.com/\".insteadOf \"https://github.com/\"; fi; \
    if ! command -v pocket-server > /dev/null; then echo 'Instalando pocket-server...'; npm install -g pocket-server --unsafe-perm=true; fi; \
    exec pocket-server start\
    "]