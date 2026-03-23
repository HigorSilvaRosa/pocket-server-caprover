FROM node:22-bookworm-slim

# Instala Git, curl (necessário para o instalador) e certificados SSL
RUN apt-get update && \
    apt-get install -y --no-install-recommends git curl ca-certificates openssh-client && \
    rm -rf /var/lib/apt/lists/*

ENV GIT_USER_NAME="Pocket Agent" \
    GIT_USER_EMAIL="agent@pocket.server" \
    # Adicionamos a pasta do executável do pocket-server ao PATH
    PATH=$PATH:/root/.pocket-server/bin

WORKDIR /app
EXPOSE 3000

# O script agora usa curl para instalar. Como a pasta /root/.pocket-server
# está mapeada no volume do CapRover, a CLI não será perdida nos reboots.
CMD ["/bin/sh", "-c", "\
    git config --global user.name \"$GIT_USER_NAME\" && \
    git config --global user.email \"$GIT_USER_EMAIL\" && \
    if [ -n \"$GITHUB_TOKEN\" ]; then git config --global url.\"https://${GITHUB_TOKEN}@github.com/\".insteadOf \"https://github.com/\"; fi; \
    if ! command -v pocket-server > /dev/null; then echo 'Instalando pocket-server...'; curl -fsSL https://www.pocket-agent.xyz/install | bash; fi; \
    exec pocket-server start\
    "]