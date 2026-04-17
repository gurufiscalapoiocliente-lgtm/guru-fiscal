# 🧾 Guru Fiscal Portugal

Assistente de mentoria fiscal para o IRS 2026 em Portugal — com IA Gemini.  
A chave de API corre exclusivamente no servidor (Vercel), nunca exposta no browser.

---

## 🔐 Arquitetura de Segurança

```
Browser (React)  →  /api/chat (Vercel Serverless)  →  Gemini API
                         ↑
                  GEMINI_API_KEY
                 (só existe aqui,
                 nunca no browser)
```

---

## 🚀 Como fazer o Deploy — Sem linha de comandos

### Pré-requisitos
- Conta em [github.com](https://github.com) (gratuita)
- Conta em [vercel.com](https://vercel.com) (gratuita — Hobby)
- Chave de API Gemini: [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

---

### Passo 1 — Criar o repositório no GitHub

1. Vai a [github.com/new](https://github.com/new)
2. Em **Repository name** escreve: `guru-fiscal`
3. Mantém **Private** (recomendado) ou **Public**
4. **NÃO** marques "Add a README file"
5. Clica **"Create repository"**

---

### Passo 2 — Fazer upload dos ficheiros

1. No repositório vazio, clica em **"uploading an existing file"** (link no centro da página)
2. **Extrai o ZIP** deste projeto no teu computador
3. Seleciona **todos os ficheiros e pastas** dentro da pasta extraída e arrasta para a área de upload do GitHub
   > ⚠️ Certifica-te que arrastas o **conteúdo** da pasta (não a pasta em si)  
   > ⚠️ A pasta `src/` e a pasta `api/` têm de ser incluídas
4. Em **"Commit changes"** escreve: `feat: initial commit - Guru Fiscal Portugal`
5. Clica **"Commit changes"**

---

### Passo 3 — Ligar o Vercel ao repositório

1. Vai a [vercel.com/new](https://vercel.com/new)
2. Clica **"Continue with GitHub"** e autoriza o acesso
3. Encontra o repositório `guru-fiscal` e clica **"Import"**
4. O Vercel deteta automaticamente que é **Vite** — não alteres nada em "Build & Output Settings"

---

### Passo 4 — Adicionar a chave de API (passo crítico)

Ainda na página de configuração do Vercel, **antes de fazer Deploy**:

1. Abre a secção **"Environment Variables"**
2. Adiciona a seguinte variável:

   | Name | Value |
   |------|-------|
   | `GEMINI_API_KEY` | `a_tua_chave_do_google_ai_studio` |

3. Clica **"Add"** para confirmar

> ✅ Esta chave fica guardada de forma segura no Vercel e nunca é exposta no código ou no browser.

---

### Passo 5 — Deploy!

Clica em **"Deploy"**.  
Em ~2 minutos o Guru Fiscal está em linha em `https://guru-fiscal-xxxx.vercel.app` 🎉

---

### Passo 6 — Domínio personalizado (opcional)

1. No painel Vercel, vai ao projeto → **"Settings"** → **"Domains"**
2. Adiciona o teu domínio (ex: `gurufiscal.pt`)
3. Segue as instruções para configurar o DNS

---

## 🔄 Como atualizar a app no futuro

Para cada alteração que quiseres fazer ao código:

1. Vai ao repositório no GitHub
2. Navega até ao ficheiro que queres editar
3. Clica no ícone de **lápis** (✏️) no canto superior direito do ficheiro
4. Faz as alterações e clica **"Commit changes"**
5. O Vercel faz o deploy automático em ~1 minuto ✅

---

## 💻 Desenvolvimento Local (opcional)

Se tiveres Node.js instalado:

```bash
npm install
cp .env.example .env.local
# Edita .env.local com a tua chave Gemini
npm run dev
# App em http://localhost:3000 com a função /api/chat também ativa
```

---

## ⚠️ Aviso Legal

O Guru Fiscal é uma ferramenta independente de literacia financeira.  
Não tem ligação à AT. A conferência e submissão final são da responsabilidade do utilizador.

---

## 💛 Apoio

Este projeto é mantido pela comunidade.  
Contribuições: guru.fiscal.apoiocliente@gmail.com
