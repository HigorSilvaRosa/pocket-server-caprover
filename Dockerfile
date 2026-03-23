# -----------------------------------------------------------------------------
# IMAGEM BASE
# Usamos o Debian Bookworm Slim com Node 22 pré-instalado.
# É leve, seguro e possui as bibliotecas 'glibc' necessárias para ferramentas web.
# -----------------------------------------------------------------------------
FROM node:22-bookworm-slim

# -----------------------------------------------------------------------------
# 1. DEPENDÊNCIAS DO SISTEMA
# Instalamos apenas o essencial para o agente funcionar e o instalador rodar.
# - git: Para o agente clonar e commitar repositórios.
# - curl: Para baixar o script de instalação oficial.
# - ca-certificates & openssh-client: Para o Git conseguir validar HTTPS/SSH.
# - coreutils: Garante que o comando 'timeout' esteja disponível no Linux.
# O 'rm -rf' no final limpa o cache do apt para manter a imagem pequena.
# -----------------------------------------------------------------------------
RUN apt-get update && \
    apt-get install -y --no-install-recommends git curl ca-certificates openssh-client coreutils && \
    rm -rf /var/lib/apt/lists/*

# -----------------------------------------------------------------------------
# 2. INSTALAÇÃO DO POCKET SERVER (Workaround)
# O script oficial tem um bug no Linux e tenta iniciar o servidor durante o build.
# Solução:
# a) Baixamos o script localmente.
# b) Usamos 'sed' para injetar os XXXXXX obrigatórios do comando 'mktemp' no Linux.
# c) Rodamos o script sob um 'timeout' de 30s. Ele instala e, quando tenta 
#    travar o terminal rodando o servidor infinitamente, o timeout o encerra.
# d) '|| true' evita que o erro do timeout cancele o build do Docker.
# e) 'test -f' verifica se o executável foi salvo com sucesso.
# -----------------------------------------------------------------------------
RUN echo "Baixando e instalando o Pocket Server..." && \
    curl -fsSL https://www.pocket-agent.xyz/install -o install.sh && \
    sed -i 's/pocket-server.tar.gz/pocket-server.XXXXXX.tar.gz/g' install.sh && \
    timeout 30 bash install.sh || true && \
    test -f /root/.pocket-server/bin/pocket-server && \
    rm install.sh

# -----------------------------------------------------------------------------
# 3. VARIÁVEIS DE AMBIENTE E PATH
# Definimos as credenciais de fallback para o Git assinar os commits.
# Adicionamos a pasta do executável do Pocket Server ao PATH do sistema
# para que o comando 'pocket-server' seja reconhecido globalmente.
# -----------------------------------------------------------------------------
ENV GIT_USER_NAME="Pocket Agent" \
    GIT_USER_EMAIL="agent@pocket.server" \
    PATH=$PATH:/root/.pocket-server/bin

# -----------------------------------------------------------------------------
# 4. CONFIGURAÇÃO DO WORKSPACE
# Definimos a pasta /app como raiz. É aqui que os repositórios (como projetos
# em Next.js ou Node.js) serão clonados pela IA.
# -----------------------------------------------------------------------------
WORKDIR /app
EXPOSE 3000

# -----------------------------------------------------------------------------
# 5. SCRIPT DE INICIALIZAÇÃO (BOOT)
# Este comando roda toda vez que o container (ou a VPS) é reiniciado.
# a) Configura o nome e email do Git com as variáveis.
# b) Se o token do GitHub existir, injeta silenciosamente para autenticação.
# c) Inicia o servidor em primeiro plano (exec) para manter o container vivo.
# -----------------------------------------------------------------------------
CMD ["/bin/sh", "-c", "\
    git config --global user.name \"$GIT_USER_NAME\" && \
    git config --global user.email \"$GIT_USER_EMAIL\" && \
    if [ -n \"$GITHUB_TOKEN\" ]; then git config --global url.\"https://${GITHUB_TOKEN}@github.com/\".insteadOf \"https://github.com/\"; fi; \
    exec pocket-server pair --remote\
    "]