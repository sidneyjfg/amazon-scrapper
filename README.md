# 📄 Variáveis de Ambiente – Amazon Scrapper

Este documento descreve todas as variáveis de ambiente utilizadas pelo **Amazon Scrapper**, explicando a finalidade de cada uma, quando são obrigatórias e como impactam a execução do sistema em produção.

---

## 🔐 Credenciais Amazon

### `AMAZON_EMAIL`
- **Descrição:** E-mail de acesso ao Amazon Seller Central.
- **Obrigatório:** ✅ Sim
- **Uso:** Utilizado no fluxo de login automatizado no Seller Central.
- **Observação:** Deve ser um usuário com permissão para acessar o faturador e exportar notas fiscais.

---

### `AMAZON_PASSWORD`
- **Descrição:** Senha da conta Amazon Seller Central.
- **Obrigatório:** ✅ Sim
- **Uso:** Autenticação no login automatizado.
- **Observação:** Recomenda-se utilizar uma conta dedicada para automação.

---

### `SECRET_TOTP`
- **Descrição:** Chave secreta usada para gerar o código de autenticação **TOTP (2FA)** automaticamente.
- **Obrigatório:** ⚠️ Sim, caso a conta possua autenticação em dois fatores habilitada.
- **Uso:** Geração do código dinâmico de segurança durante o login.
- **Importante:**
  - ❗ Não alterar esse valor sem validação
  - ❗ Nunca versionar em repositórios públicos
  - Deve estar codificado em **Base32**

---

## 🚚 Configuração de SFTP

### `SFTP_HOST`
- **Descrição:** Endereço do servidor SFTP de destino.
- **Obrigatório:** ✅ Sim
- **Uso:** Host para envio dos arquivos XML filtrados.

---

### `SFTP_PORT`
- **Descrição:** Porta do servidor SFTP.
- **Obrigatório:** ✅ Sim
- **Padrão:** `22`

---

### `SFTP_USER`
- **Descrição:** Usuário para autenticação no servidor SFTP.
- **Obrigatório:** ✅ Sim

---

### `SFTP_PASSWORD`
- **Descrição:** Senha do usuário SFTP.
- **Obrigatório:** ✅ Sim
- **Observação:** Pode ser substituído futuramente por autenticação via chave SSH.

---

### `SFTP_BASE_PATH`
- **Descrição:** Diretório base no servidor SFTP onde os arquivos serão enviados.
- **Obrigatório:** ✅ Sim
- **Exemplo:** `/import/in`
- **Observação:** O sistema cria automaticamente subdiretórios por cliente, plataforma e data.

---

## 📡 Webhook de Notificação

### `WEBHOOK_URL`
- **Descrição:** URL do webhook para envio de notificações de execução.
- **Obrigatório:** ❌ Não (altamente recomendado)
- **Uso:** Envio de logs de sucesso ou erro para Google Chat.
- **Formato esperado:** Payload compatível com Google Chat (`{ "text": "mensagem" }`).

---

## ⏰ Agendamento (Cron)

### `CRON_SCHEDULE`
- **Descrição:** Expressão cron utilizada pelo `node-cron` para definir quando o job será executado.
- **Obrigatório:** ❌ Não
- **Padrão:** `0 6 * * *` (diariamente às 06:00)
- **Exemplos:**
  - `*/1 * * * *` → executa a cada minuto
  - `0 6 * * *` → executa diariamente às 06:00

> 📌 O container permanece sempre ativo, porém o job só executa quando o cron é disparado.

---

## 📅 Intervalo de Datas

Mapeado para ser 4 dias sempre

---

## 🧾 Filtro Fiscal (`natOp`)

### `ALLOWED_NAT_OP`
- **Descrição:** Lista de **Naturezas da Operação (natOp)** permitidas para envio via SFTP.
- **Obrigatório:** ❌ Não
- **Formato:** Valores separados por ponto e vírgula (`;`)
- **Exemplo:**
  ```env
  ALLOWED_NAT_OP=DEVOLUCAO DE VENDA DE MERCADORIA;VENDA DE MERCADORIA DESTINADA A NAO CONTRIBUINTE
