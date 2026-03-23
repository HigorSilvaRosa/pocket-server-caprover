FROM node:22-bookworm-slim

# 1. Apenas instala o Git (removemos a configuração de usuário daqui)
RUN apt-get update && \
    apt-get install -y --no-install-recommends git && \
    rm -rf /var/lib/apt/lists/*

# 2. Definimos as variáveis de ambiente com os valores padrão (Fallback)
ENV GIT_USER_NAME="Pocket Agent"
ENV GIT_USER_EMAIL="agent@pocket.server"
ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=$PATH:/home/node/.npm-global/bin

WORKDIR /app
EXPOSE 3000

# 3. O script de inicialização agora configura o Git usando as variáveis antes de ligar o servidor
CMD ["/bin/sh", "-c", "\
    git config --global user.name \"$GIT_USER_NAME\" && \
    git config --global user.email \"$GIT_USER_EMAIL\" && \
    if [ -n \"$GITHUB_TOKEN\" ]; then git config --global url.\"https://${GITHUB_TOKEN}@github.com/\".insteadOf \"https://github.com/\"; fi; \
    if ! command -v pocket-server > /dev/null; then echo 'Instalando pocket-server...'; npm install -g pocket-server; fi; \
    exec pocket-server start\
    "]