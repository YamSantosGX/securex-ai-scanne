# 🔒 SecureX AI Scanner

Um scanner inteligente para analisar código e apontar possíveis problemas de segurança com ajuda de modelos de IA. Projeto construído com foco em velocidade, UX e integração fácil com APIs de IA. Ideal como POC, ferramenta de análise local ou integração CI.

✨ Visual, prático e feito com TypeScript, React + Vite e Tailwind CSS.

---

## 🚀 Destaques
- ✅ Interface leve com Vite + React + TypeScript
- 🎨 Estilo com Tailwind CSS (shadcn-ui para componentes)
- 🤖 Scanner baseado em modelo de IA (ex.: OpenAI, Anthropic — você escolhe)
- 🧩 Fácil de estender: backend simples em Node/Express para proxy de chamadas à IA
- ♻️ Scripts prontos para dev, build e preview

---

## 🧰 Tecnologias utilizadas
- TypeScript — tipagem forte em todo o projeto
- React — UI
- Vite — bundler rápido para dev e build
- Tailwind CSS — utilitários CSS
- shadcn-ui — componentes UI (Radix + Tailwind)
- Node.js + Express (exemplo de backend) — proxy seguro para chamadas a modelos de IA
- dotenv — gerenciamento de variáveis de ambiente

Linguagens no repositório: TypeScript, JavaScript, HTML, CSS.

---

## ⚡ Resultado visual (exemplo)
> Interface com:
- Upload/textarea para código
- Botão "Scan" com progresso
- Painel de resultados com severidade (info/warning/critical) e sugestões

---

## 🧭 Quick Start (Desenvolvimento)

Pré-requisitos:
- Node.js >= 18
- npm ou pnpm/yarn

1. Clone o repositório
```bash
git clone https://github.com/YamSantosGX/securex-ai-scanner.git
cd securex-ai-scanner
```

2. Instale dependências
```bash
npm install
# ou
# pnpm install
```

3. Configure variáveis de ambiente
Crie um arquivo `.env` na raiz:

```env
# Para o frontend (Vite): variáveis precisam começar com VITE_
VITE_AI_PROVIDER=openai
VITE_AI_API_KEY=your_openai_api_key_here

# Para o backend (se usar o exemplo Express)
OPENAI_API_KEY=your_openai_api_key_here
PORT=4000
```

4. Executar em dev
```bash
npm run dev
# normalmente mapeia para: vite
```

5. Build para produção
```bash
npm run build
npm run preview
```

---

## 🧩 Estrutura sugerida e exemplos de código

Abaixo há exemplos mínimos para você entender como implementar o frontend (React + Vite) e um backend proxy em TypeScript (Express) para chamar a API de IA com segurança.

### 1) Frontend — src/App.tsx
```tsx
import React, { useState } from 'react';

export default function App() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleScan() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      setResult(data.summary ?? JSON.stringify(data, null, 2));
    } catch (err) {
      setResult('Erro ao escanear: ' + String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🔒 SecureX AI Scanner</h1>
      <textarea
        className="w-full h-56 p-3 border rounded mb-3 font-mono text-sm"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Cole seu código aqui..."
      />
      <div className="flex gap-2">
        <button className="btn-primary" onClick={handleScan} disabled={loading}>
          {loading ? 'Escaneando...' : '🔎 Scan'}
        </button>
      </div>

      {result && (
        <section className="mt-6 p-4 bg-gray-50 rounded">
          <h2 className="font-semibold mb-2">Resultado</h2>
          <pre className="whitespace-pre-wrap text-sm">{result}</pre>
        </section>
      )}
    </main>
  );
}
```

### 2) Backend (proxy) — server/src/index.ts (Express + TypeScript)
Obs: chamar a API diretamente do frontend expõe a chave — use backend para segurança.
```ts
import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json());

app.post('/api/scan', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'code is required' });

  try {
    // Exemplo de chamada simples à API de IA (OpenAI com endpoint de completions/chat)
    const openaiKey = process.env.OPENAI_API_KEY;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // ajuste conforme sua conta/fornecedor
        messages: [
          { role: 'system', content: 'Você é um scanner de segurança de código. Aponte riscos e sugira correções curtas.' },
          { role: 'user', content: `Analise o código abaixo e descreva problemas de segurança:\n\n${code}` }
        ],
        max_tokens: 600
      })
    });

    const json = await response.json();
    // Ajuste conforme o formato do provedor
    const summary = json?.choices?.[0]?.message?.content ?? JSON.stringify(json);
    res.json({ summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to scan' });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API proxy rodando em http://localhost:${port}`));
```

### 3) Integração de Frontend com Backend em desenvolvimento
- No Vite, adicione no `vite.config.ts`:
```ts
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:4000'
    }
  }
});
```

---

## 🛡️ Boas práticas de segurança
- Nunca commit suas chaves. Use `.env` e variáveis de ambiente no host.
- Adicione `.env` ao `.gitignore`.
- Para uso em CI, configure segredos no provedor (GitHub Actions, etc).
- Limite tokens e monitore uso da API.

---

## ✅ Scripts úteis (package.json)
Sugestão de scripts:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "start:server": "ts-node server/src/index.ts",
    "lint": "eslint . --ext .ts,.tsx",
    "format": "prettier --write ."
  }
}
```

---

## 🤝 Contribuições
Contribuições são bem-vindas! Abra issues com ideias de features, melhorias de regras de análise, ou PRs com pequenos ajustes. Use um branch por feature e escreva um commit claro.

- Sugestões: adicionar regras customizadas, configurar integração com scanners SAST, adicionar análise por file-tree (varrer todo repositório) e logs detalhados.

---

## 📜 Licença
Adicione a licença que preferir (MIT é uma opção comum). Se preferir, indique aqui.
```
