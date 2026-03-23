FROM node:22-bookworm-slim

# 1. Instala as dependências básicas
RUN apt-get update && \
    apt-get install -y --no-install-recommends git curl ca-certificates openssh-client && \
    rm -rf /var/lib/apt/lists/*

# 2. Baixamos o script, consertamos o bug do Linux, instalamos E forçamos o encerramento do script caso ele tente travar o build
RUN echo "Baixando, corrigindo e instalando..." && \
    curl -fsSL https://www.pocket-agent.xyz/install -o install.sh && \
    sed -i 's/pocket-server.tar.gz/pocket-server.XXXXXX.tar.gz/g' install.sh && \
    # Modificamos o script deles na hora para remover a linha que tenta iniciar o servidor
    sed -i 's/pocket-server start//g' install.sh && \
    bash install.sh && \
    rm install.sh

# 3. Variáveis e PATH
ENV GIT_USER_NAME="Pocket Agent" \
    GIT_USER_EMAIL="agent@pocket.server" \
    PATH=$PATH:/root/.pocket-server/bin

WORKDIR /app
EXPOSE 3000

# 4. O script de inicialização agora é super limpo, apenas configura o Git e liga o servidor
CMD ["/bin/sh", "-c", "\
    git config --global user.name \"$GIT_USER_NAME\" && \
    git config --global user.email \"$GIT_USER_EMAIL\" && \
    if [ -n \"$GITHUB_TOKEN\" ]; then git config --global url.\"https://${GITHUB_TOKEN}@github.com/\".insteadOf \"https://github.com/\"; fi; \
    exec pocket-server start\
    "]