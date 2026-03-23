# -----------------------------------------------------------------------------
# 1. IMAGEM BASE
# Usamos o Node 22 (Bookworm Slim) para garantir compatibilidade com bibliotecas C.
# -----------------------------------------------------------------------------
FROM node:22-bookworm-slim

# -----------------------------------------------------------------------------
# 2. DEPENDÊNCIAS DO SISTEMA
# - git/curl/ca-certificates: Essenciais para o funcionamento e download.
# - coreutils: Fornece o comando 'timeout' usado no passo de instalação.
# -----------------------------------------------------------------------------
RUN apt-get update && \
    apt-get install -y --no-install-recommends git curl ca-certificates openssh-client coreutils && \
    rm -rf /var/lib/apt/lists/*

# -----------------------------------------------------------------------------
# 3. INSTALAÇÃO COM CORREÇÃO DE BUG (Workaround)
# O script oficial falha no Linux (mktemp) e tenta ligar o servidor no build.
# - 'sed' nos XXXXXX: Corrige o bug do mktemp no GNU/Linux.
# - 'timeout 30': Deixa instalar mas mata o processo se ele tentar travar o build.
# - 'test -f': Garante que o executável realmente existe antes de fechar a imagem.
# -----------------------------------------------------------------------------
RUN echo "Instalando Pocket Server com correções..." && \
    curl -fsSL https://www.pocket-agent.xyz/install -o install.sh && \
    sed -i 's/pocket-server.tar.gz/pocket-server.XXXXXX.tar.gz/g' install.sh && \
    timeout 30 bash install.sh || true && \
    test -f /root/.pocket-server/bin/pocket-server && \
    rm install.sh

# -----------------------------------------------------------------------------
# 4. VARIÁVEIS DE AMBIENTE (O PULO DO GATO)
# - COLUMNS/LINES: Força o sistema a pensar que existe um terminal de 80x24.
#   Isso evita o erro 'RangeError: Invalid count value: -1' ao desenhar o PIN.
# - TERM: Define o tipo de terminal para formatar cores e tabelas nos logs.
# - PATH: Adiciona o binário do Pocket ao comando global do sistema.
# -----------------------------------------------------------------------------
ENV GIT_USER_NAME="Pocket Agent" \
    GIT_USER_EMAIL="agent@pocket.server" \
    PATH=$PATH:/root/.pocket-server/bin \
    COLUMNS=80 \
    LINES=24 \
    TERM=xterm

# -----------------------------------------------------------------------------
# 5. CONFIGURAÇÃO DE DIRETÓRIO
# Pasta /app mapeada no volume do CapRover para persistência de código.
# -----------------------------------------------------------------------------
WORKDIR /app
EXPOSE 3000

# -----------------------------------------------------------------------------
# 6. COMANDO DE INICIALIZAÇÃO (MODO PAIR INFINITO)
# - Configura o Git (usando o seu GITHUB_TOKEN se disponível).
# - 'pair --remote': Gera o PIN e abre o túnel para acesso via internet.
# - Como o comando 'pair' encerra após 60s, o container vai reiniciar e
#   gerar um novo PIN automaticamente, criando o ciclo infinito nos logs.
# -----------------------------------------------------------------------------
CMD ["/bin/sh", "-c", "\
    git config --global user.name \"$GIT_USER_NAME\" && \
    git config --global user.email \"$GIT_USER_EMAIL\" && \
    if [ -n \"$GITHUB_TOKEN\" ]; then git config --global url.\"https://${GITHUB_TOKEN}@github.com/\".insteadOf \"https://github.com/\"; fi; \
    exec pocket-server pair --remote\
    "]