# Pocket Server CapRover Deployment

Este projeto contém os arquivos de configuração necessários para realizar o deploy do servidor `pocket-server` de forma automatizada e isolada utilizando o [CapRover](https://caprover.com/).

## 📁 Estrutura do Projeto

- `Dockerfile`: Arquivo responsável por configurar a imagem do contêiner. Ele é baseado na imagem oficial do Node.js (`node:22-bookworm-slim`), instala o Git, configura os diretórios corretos para o NPM lidar com pacotes globais e define um script executável robusto na sua inicialização.
- `captain-definition.json`: Arquivo padrão do CapRover que indica que o deploy da aplicação deve ser construído a partir do `Dockerfile`.

## ⚙️ Como funciona

Ao iniciar o contêiner no CapRover, o script incluído no `Dockerfile` realiza as seguintes ações automaticamente:

1. **Configuração Dinâmica do Git:** Configura globalmente seu nome de usuário e e-mail baseado nas variáveis de ambiente estabelecidas. 
2. **Autenticação com GitHub:** (Opcional) Se a variável `GITHUB_TOKEN` for definida, converte conexões de HTTPS no Git para usar o token embutido automaticamente. Isso permite contornar problemas de autenticação e Rate Limits ao usar pacotes baseados no ecossistema do Github.
3. **Instalação do Servidor:** Verifica se o CLI `pocket-server` já está disponível. Caso não esteja, instala o pacote globalmente via `npm install -g pocket-server`.
4. **Execução:** Start do processo com `pocket-server start`.

O contêiner expõe por padrão a porta `3000`, a qual será roteada pelo provedor NGINX interno do CapRover.

## 🔑 Variáveis de Ambiente

As seguintes variáveis de ambiente podem (e devem) ser configuradas na página do seu aplicativo no Dashboard do CapRover, na aba **App Configs**:

| Variável | Descrição | Valor Padrão (Fallback) |
|----------|-------------|--------------------------|
| `GIT_USER_NAME` | Nome de usuário que será gravado nos commits / interface Git. | `"Pocket Agent"` |
| `GIT_USER_EMAIL` | Endereço de e-mail do usuário Git. | `"agent@pocket.server"` |
| `GITHUB_TOKEN` | *Personal Access Token* do GitHub. Útil para dependências do servidor que demandem baixar código de repositórios privados ou atingirem limite de API. | *(Não definido)* |

## 🚀 Como Fazer o Deploy

Você tem algumas opções suportadas pelo CapRover para fazer o push dessa infraestrutura:

### 1. Ferramenta CapRover CLI (Recomendado)
Considerando que você tem a CLI instalada (`npm install -g caprover`) e previamente logada via `caprover serversetup`:
1. Abra um terminal neste diretório.
2. Digite `caprover deploy` e confirme o nome da sua aplicação remota de destino.

### 2. Integração com Repositório Git / Webhooks
1. Faça o envio deste código para um serviço na nuvem (GitHub, GitLab, BitBucket, etc.).
2. No painel do sistema CapRover, vá em **Deployment** -> **Method 3: Repository**. Conecte as credenciais, sinalize a branch atual e mande fazer o Fetch dinâmico do último commit a cada nova atualização que você der (ativando a opção Webhooks no provedor).

### 3. Upload direto pelo formato Tarball (.tar)
1. Compacte os dois arquivos listados num arquivo final (por ex `deploy.tar`).
2. Acesse a guia **Deployment** do seu App no CapRover, no seletor do **Method 1: Tarball**, e insira o `.tar` gerado.

## 💾 Persistência de Dados (Volumes)
Se o modo de execução do `pocket-server` criar uma base de dados local ou salvar arquivos (Ex: bases SQLite, JSON files), lembre-se de configurar um **Persistent Directory** no CapRover. Assim, as informações da sua aplicação não serão apagadas cada vez que houver um reinício do contêiner.

Normalmente, deve-se mapear da sua Path inside container (geralmente sob o diretório principal `/app/db` ou diretório semelhante específico do _pocket server_) indicando um rótulo do lado de fora do servidor.
