<p align="center">
  <img src="public/logo.png" alt="Gection" width="72" />
</p>

<h1 align="center">GECTION</h1>

<p align="center">
  <b>Gestão em ação</b>
  <br />
  Transforme organização financeira em decisões inteligentes.
  <br /><br />
  <a href="https://github.com/renato0x/gection">
    <img src="https://img.shields.io/badge/Tauri-2.11-6366f1?logo=tauri&labelColor=0b1120&logoColor=white" alt="Tauri" />
  </a>
  <a href="https://react.dev">
    <img src="https://img.shields.io/badge/React_19-61DAFB?logo=react&labelColor=0b1120&logoColor=white" alt="React" />
  </a>
  <a href="https://www.typescriptlang.org">
    <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&labelColor=0b1120&logoColor=white" alt="TypeScript" />
  </a>
  <a href="https://www.rust-lang.org">
    <img src="https://img.shields.io/badge/Rust-2021-000000?logo=rust&labelColor=0b1120&logoColor=white" alt="Rust" />
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/license_MIT-22c55e?labelColor=0b1120&logoColor=white" alt="MIT" />
  </a>
</p>

<br />

**Gection** — fusão de *Gestão* e *Action* — nasce da ideia de que controlar suas finanças não deve ser uma tarefa passiva. É um sistema desktop nativo, offline-first, que une o rigor do planejamento financeiro com a agilidade de um produto moderno. Cada tela, cada gráfico, cada insight existe para transformar dados em decisões.

<br />

---

<br />

## Visão Geral

| Funcionalidade | Descrição |
|---|---|
| **Dashboard** | Indicadores em tempo real: saldo, receitas, despesas à vista e no crédito, fatura aberta, renda esperada, gastos por tag e categoria, comparativo mensal |
| **Contas** | Corrente, poupança, crédito, dinheiro e investimento — cada uma com saldo, limite e ciclo próprio |
| **Transações** | Receitas, despesas, transferências e crédito com parcelamento inteligente por ciclo de fatura |
| **Faturas** | Ciclo baseado em fechamento/vencimento, parcelas correntes e futuras separadas |
| **Orçamentos** | Limites por categoria com sugestão 50/30/20, alerta de estouro e progresso visual |
| **Tags** | Categorização transversal com agregadores de gastos e página de detalhes por tag |
| **Assinaturas** | Cobranças recorrentes com geração automática de transações na data correta |
| **Acertos** | Controle de valores emprestados e recebidos com writeoffs, transações vinculadas e pessoas reutilizáveis |
| **Fontes de Renda** | Registro de entradas fixas e variáveis para cálculo de renda esperada |
| **Calendário** | Visão mensal com saldo acumulado por dia |

<br />

## Diferenciais

- **100% offline e privado** — seus dados nunca saem da sua máquina. Sem cadastro, sem nuvem, sem telemetria.
<<<<<<< HEAD
- **Banco SQLite portátil** — o arquivo `gection.db` fica em `Documentos/Gection/`, fácil de localizar, copiar e transferir para outra máquina.
=======
>>>>>>> 3e710b673d6cfba6e1ecee65b26de1012032a749
- **Experimento desktop nativo** — construído com Tauri + Rust, entregando performance de aplicação real sem depender de navegador.
- **Tema escuro consistente** — interface dark única, pensada para longas sessões de uso sem cansar a visão.
- **Ciclo real de cartão de crédito** — lógica de fechamento e vencimento que respeita o funcionamento real de faturas.

<br />

## Tecnologias

```
Frontend           React 19 · TypeScript 6 · Tailwind CSS v4 · Recharts · Zustand · React Router v7
Backend            Tauri 2.11 · Rust 2021 edition · rusqlite · SQLite
Ícones             Lucide
Fonte              Inter
```

<br />

## Screenshots

> *Em breve — capturas de tela demonstrando Dashboard, Faturas, Orçamentos e demais módulos.*

<br />

## Instalação

### Windows

**Passo 1 — Instalar Node.js**

Baixe e instale o Node.js 18 ou superior em [nodejs.org](https://nodejs.org).  
O npm já vem junto.

**Passo 2 — Instalar Rust**

Abra o PowerShell como Administrador e cole:

```powershell
# Isso baixa e instala o Rust (toolchain stable)
winget install Rustlang.Rustup
# ou, se preferir: https://rustup.rs
```

Depois de instalado, feche e reabra o terminal. Confirme que funcionou:

```powershell
node --version    # deve mostrar v18 ou maior
npm --version     # deve mostrar 10 ou maior
rustc --version   # deve mostrar 1.77 ou maior
```

**Passo 3 — WebView2**

O Windows 10/11 já vem com o WebView2 instalado.  
Se estiver no Windows 8 ou inferior, baixe em [developer.microsoft.com](https://developer.microsoft.com/pt-br/microsoft-edge/webview2/).

**Passo 4 — Baixar e rodar o Gection**

```powershell
git clone https://github.com/renato0x/gection.git
cd gection
npm install
npm run tauri dev
```

> Para compilar a versão final (instalador .msi ou .exe):
> ```powershell
> npm run tauri build
> ```

---

### Linux (Zorin OS / Ubuntu / Debian)

**Passo 1 — Instalar as dependências do sistema**

Zorin OS, Ubuntu, Debian e derivados usam o mesmo gerenciador de pacotes (apt):

```bash
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  librsvg2-dev \
  patchelf \
  libsoup-3.0-dev \
  libjavascriptcoregtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file
```

> No Zorin OS 16+ e Ubuntu 22.04+, o pacote `libappindicator3-dev` foi substituído por `libayatana-appindicator3-dev`. Instale-o separadamente se precisar de bandeja de sistema:
> ```bash
> sudo apt install -y libayatana-appindicator3-dev
> ```

**Passo 2 — Instalar Node.js**

```bash
# Opção recomendada: usar nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# Feche e abra o terminal, ou rode:
source ~/.bashrc
nvm install 22
nvm use 22
```

> Alternativa via apt:
> ```bash
> sudo apt install -y nodejs npm
> ```

**Passo 3 — Instalar Rust**

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# Escolha a opção padrão (1)
source ~/.bashrc
```

**Passo 4 — Confirmar as instalações**

```bash
node --version    # v18 ou maior
npm --version     # 10 ou maior
rustc --version   # 1.77 ou maior
```

**Passo 5 — Baixar e rodar o Gection**

```bash
git clone https://github.com/renato0x/gection.git
cd gection
npm install
npm run tauri dev
```

> Para compilar a versão final (.deb ou AppImage):
> ```bash
> npm run tauri build
> ```

---

### Outras distribuições Linux

| Distribuição | Comando |
|---|---|
| **Fedora** | `sudo dnf install webkit2gtk4.1-devel gtk3-devel libappindicator-gtk3-devel librsvg2-devel patchelf libsoup3-devel javascriptcoregtk4.1-devel` |
| **Arch** | `sudo pacman -S webkit2gtk-4.1 gtk3 libappindicator-gtk3 librsvg patchelf libsoup3 javascriptcoregtk4.1` |
| **openSUSE** | `sudo zypper install webkit2gtk-4.1-devel gtk3-devel libappindicator3-devel librsvg2-devel patchelf libsoup3-devel javascriptcoregtk4.1-devel` |

---

Tudo pronto. O banco SQLite (`gection.db`) é criado automaticamente na pasta **Documentos/Gection/** na primeira execução. Para migrar seus dados para outro computador, basta copiar esse arquivo.

<br />

<br />

## Comandos

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor Vite (frontend isolado) |
| `npm run build` | Type-check + build frontend |
| `npm run lint` | ESLint |
| `npm run tauri dev` | Desenvolvimento completo (Vite + Tauri) |
| `npm run tauri build` | Compilação para distribuição |

<br />

## Estrutura

```
src                        Frontend React
├── components
│   ├── layout             Sidebar, Header, Layout
│   └── ui                 Card, Button, Modal, Input, Select, Badge, ProgressBar, EmptyState
├── lib                    API client, formatação, utilitários
├── pages                  Dashboard, Transações, Faturas, Orçamento, Contas, etc.
├── stores                 Zustand (UI, accounts, transactions, budgets, etc.)
├── types                  Tipos compartilhados TypeScript
└── index.css              Estilos globais, animações, design tokens

src-tauri                  Backend Rust
├── src
│   ├── commands           Handlers Tauri (accounts, transactions, dashboard, invoice, etc.)
│   ├── db                 Conexão, modelos, migrações SQLite
│   ├── lib.rs             Setup: banco, comandos, plugins
│   └── main.rs            Entry point
├── icons                  Ícones do aplicativo
├── capabilities           Permissões Tauri
└── tauri.conf.json        Configuração Tauri
```

<br />

## Licença

MIT © [renato0x](https://github.com/renato0x)

<br />

---

<p align="center">
  <b>Gection — Gestão em ação</b>
  <br />
  <sub>Feito com Rust, TypeScript e muito café</sub>
</p>
