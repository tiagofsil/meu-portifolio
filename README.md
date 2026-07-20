# Tiago Fernandes — Portfólio / Currículo

Site pessoal one-page para Tiago Fernandes, estudante de Análise e
Desenvolvimento de Sistemas com foco em Dados & Business Intelligence.

Visual dark-first com glassmorphism e acentos neon (ciano/roxo), com um
elemento de assinatura: um painel de KPIs animado no hero, remetendo ao
universo de dashboards de BI — a área de atuação do Tiago.

## 📁 Estrutura do projeto

```
site/
├── index.html          → marcação de todas as seções
├── css/
│   └── style.css       → design system, layout, animações, responsivo
├── js/
│   ├── i18n.js          → dicionário de traduções (PT/EN/ES)
│   └── script.js        → idioma, tema, animações, formulário
├── backend/             → OPCIONAL: exemplo de backend Flask seguro
│   ├── app.py
│   └── requirements.txt
├── vercel.json          → cabeçalhos de segurança para deploy na Vercel
├── netlify.toml         → cabeçalhos de segurança para deploy na Netlify
└── README.md
```

## 🚀 Como rodar localmente

Como é um site 100% estático (HTML/CSS/JS puro, sem build), basta abrir
`index.html` no navegador — mas para as fontes e o `fetch` funcionarem
corretamente é melhor servir por um mini servidor local:

```bash
cd site
python3 -m http.server 8000
# depois abra http://localhost:8000
```

## 🌐 Deploy gratuito

**Vercel**
1. Crie uma conta em vercel.com e conecte seu repositório GitHub (suba a
   pasta `site/` para um repo, por exemplo com o GitHub que já está no seu
   currículo: `github.com/tiagofsil`).
2. Importe o projeto — a Vercel detecta um site estático automaticamente.
3. O `vercel.json` já configura os cabeçalhos de segurança (CSP, HSTS etc.)
   e o HTTPS é automático.

**Netlify**
1. Arraste a pasta `site/` em app.netlify.com/drop, ou conecte o repositório.
2. O `netlify.toml` já aplica os mesmos cabeçalhos de segurança.
3. HTTPS também é automático em qualquer domínio *.netlify.app.

## 🌍 Sistema de idiomas

- Três idiomas: Português (padrão), Inglês e Espanhol.
- Na primeira visita, detecta o idioma do navegador (`navigator.language`)
  e usa Português como fallback se o idioma não for suportado.
- A escolha do usuário fica salva em `localStorage` (`tf_lang`) e é
  respeitada em visitas futuras.
- Para adicionar uma nova língua: duplique um bloco em `js/i18n.js`,
  traduza os valores e adicione um botão em `.lang-switch` no `index.html`.

> **Nota sobre URLs amigáveis (`/pt`, `/en`, `/es`)**: o prompt original
> pedia rotas por idioma. Como o site é uma página única estática (sem
> roteador de servidor), implementei a troca de idioma via JavaScript +
> `localStorage`, que é o padrão para sites desse tipo e evita duplicar o
> HTML três vezes. Se você quiser URLs de fato separadas (`/en/index.html`
> etc., por SEO, por exemplo), posso gerar essa estrutura junto — é só
> pedir.

## 🛡️ Segurança — o que está implementado e por quê

Este site é **estático** (sem servidor de aplicação nem banco de dados por
padrão), então parte das medidas do prompt original só faz sentido se você
ativar o backend opcional em `/backend`. Veja o que se aplica em cada caso:

| Medida | Onde está | Status |
|---|---|---|
| Sanitização/validação de campos | `js/script.js` (`sanitize`, `isValidEmail`) e `backend/app.py` | ✅ Front e back |
| Proteção XSS (escape de caracteres) | `js/script.js` (`sanitize`) + Jinja2 autoescape no backend | ✅ |
| Honeypot anti-spam | Campo oculto `#website` no formulário | ✅ |
| Rate limiting | Limite simples no front (`js/script.js`) + Flask-Limiter no backend | ⚠️ Front é só cosmético — o real é no backend |
| CSP, X-Content-Type-Options, Referrer-Policy | `<meta>` no HTML + `vercel.json`/`netlify.toml` + backend | ✅ |
| X-Frame-Options, HSTS | Não dá para setar por `<meta>` — feito via `vercel.json`/`netlify.toml`/backend | ✅ (config, não HTML) |
| HTTPS | Automático na Vercel/Netlify | ✅ |
| Cookies HttpOnly/Secure/SameSite | Configurado em `backend/app.py` | Só relevante se o backend for usado |
| CSRF Token | `Flask-WTF` no `backend/app.py` | Só relevante se o backend for usado |
| Proteção SQL Injection | Nenhum banco de dados neste projeto — comentário no `app.py` mostra como fazer (queries parametrizadas) caso você adicione um | 📌 Preparado, não ativo |
| Hash de senha (bcrypt) | Biblioteca já importada em `app.py`, pronta para o dia em que houver login | 📌 Preparado, não ativo |

**Resumindo**: sem o backend, o formulário de contato funciona via
`mailto:` (abre o cliente de e-mail do visitante já preenchido) — não
existe superfície de ataque de servidor porque não existe servidor. Se
você quiser que o formulário envie de verdade sem abrir o e-mail do
visitante (ex: via SendGrid), suba o `backend/app.py` em um serviço como
Render/Railway e troque a função `submitForm` em `js/script.js` para usar
`fetch('/api/contact', ...)` em vez de `mailto:`.

## ✏️ O que trocar antes de publicar

1. **Foto de perfil**: hoje é um placeholder com as iniciais "TF" (em
   `.avatar-frame__photo` no `css/style.css`). Troque o comentário
   `background-image: url('sua-foto.jpg')` por uma foto real.
2. **Redes sociais**: só incluí GitHub, LinkedIn e e-mail porque foram os
   únicos que você me passou. Se quiser adicionar Instagram/X/YouTube,
   me manda os links reais e eu incluo os cards (deixei o CSS já pronto
   para isso, em `.social__grid`).
3. **Endereço**: no currículo original consta seu endereço completo. Optei
   por não colocar o endereço físico no site público (só GitHub/LinkedIn/
   e-mail) — é uma prática comum para currículos on-line evitar expor
   endereço residencial a qualquer visitante. Se quiser, dá para
   adicionar só "Buenos Aires, Argentina" em vez do endereço completo.

## 🧩 Tecnologias usadas

- HTML5 semântico, CSS3 (variáveis nativas, sem framework), JavaScript
  puro (sem dependências/build step).
- Backend opcional: Python + Flask (aproveitando suas próprias habilidades
  do currículo).
