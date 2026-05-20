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

```bash
# Pré-requisitos: Node.js 18+, Rust stable toolchain, dependências Tauri
# Veja: https://v2.tauri.app/start/prerequisites/

git clone https://github.com/renato0x/gection.git
cd gection
npm install
npm run tauri dev     # desenvolvimento
npm run tauri build   # produção
```


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
