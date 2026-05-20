# GECTION

> Gerenciador financeiro pessoal para desktop.

Aplicação desktop nativa para controle de finanças pessoais com contas, cartões de crédito, faturas, parcelamentos, orçamentos, tags, assinaturas, acertos entre pessoas e dashboard analítico — tudo rodando localmente no seu computador com banco de dados próprio em SQLite.

![Tauri](https://img.shields.io/badge/Tauri-2.x-6366f1?logo=tauri)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript)
![Rust](https://img.shields.io/badge/Rust-edition_2021-000000?logo=rust)
![MIT](https://img.shields.io/badge/license-MIT-22c55e)

---

## Funcionalidades

- **Dashboard** — visão geral com saldo real, receitas, despesas à vista e no crédito, fatura aberta, renda esperada, gastos por tag/categoria e comparativo mensal
- **Contas** — contas corrente, poupança, crédito, dinheiro e investimento com saldo individual
- **Transações** — receitas, despesas, transferências e transações de crédito com parcelamento
- **Faturas** — visualização por ciclo de fechamento com parcelas correntes e futuras
- **Cartão de Crédito** — suporte a dia de fechamento e vencimento, cálculo automático de ciclo
- **Parcelamentos** — parcelas distribuídas por mês de vencimento da fatura
- **Orçamentos** — definição de limites por categoria com sugestão 50/30/20 e alerta de estouro
- **Tags** — categorização transversal de transações com gastos agregados
- **Assinaturas** — cobranças recorrentes com geração automática de transações
- **Acertos** — controle de valores emprestados/recebidos com pessoas reutilizáveis, writeoffs e transações vinculadas
- **Fontes de Renda** — registro de entradas fixas e variáveis para cálculo de renda esperada
- **Calendário** — visão mensal com saldo acumulado por dia (somente dias passados/hoje)
- **Tema escuro** — interface dark única, sem modo claro

## Privacidade e Segurança

- **100% local** — todos os dados ficam exclusivamente no seu computador
- **Sem internet** — nenhum dado sai da máquina, não requer cadastro ou login
- **Banco SQLite** — banco de dados criado automaticamente em `app_data_dir/gection.db`
- **Sem telemetria** — zero rastreamento, coleta de uso ou analytics
- **Cada máquina tem seu próprio banco** — ao copiar o executável para outro PC, um novo banco vazio é criado automaticamente na primeira execução

## Stack Tecnológica

| Camada     | Tecnologia                                                            |
| ---------- | --------------------------------------------------------------------- |
| Interface  | [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org) |
| Estilos    | [Tailwind CSS v4](https://tailwindcss.com)                            |
| Gráficos   | [Recharts](https://recharts.org)                                      |
| Estado     | [Zustand](https://github.com/pmndrs/zustand)                          |
| Rotas      | [React Router v7](https://reactrouter.com)                            |
| Ícones     | [Lucide](https://lucide.dev)                                          |
| Backend    | [Tauri v2](https://v2.tauri.app) (Rust)                              |
| Banco      | [SQLite](https://www.sqlite.org) via [rusqlite](https://github.com/rusqlite/rusqlite) |

## Pré-requisitos

Antes de começar, instale em sua máquina:

- **Node.js** 18 ou superior — [nodejs.org](https://nodejs.org)
- **Rust** (toolchain stable) — [rustup.rs](https://rustup.rs)
- **Dependências do Tauri** — consulte o guia oficial: [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/)

## Como usar

```bash
# Clone o repositório
git clone https://github.com/renato0x/gection.git
cd gection

# Instale as dependências do frontend
npm install

# Execute em modo de desenvolvimento
npm run tauri dev

# Ou compile para produção
npm run tauri build
```

Na primeira execução, o banco de dados SQLite é criado automaticamente — nenhuma configuração manual é necessária.

## Comandos disponíveis

| Comando                 | Descrição                                        |
| ----------------------- | ------------------------------------------------ |
| `npm run dev`           | Inicia o servidor Vite (frontend isolado)        |
| `npm run build`         | Type-check + build do frontend                   |
| `npm run lint`          | Executa ESLint                                   |
| `npm run tauri dev`     | Ambiente completo de desenvolvimento (Vite + Tauri) |
| `npm run tauri build`   | Gera o instalador para a plataforma atual        |

## Estrutura do projeto

```
src/                          # Frontend React
├── components/               # Componentes reutilizáveis
│   ├── layout/               # Layout, Sidebar, Header
│   └── ui/                   # Card, Button, Modal, Input, etc.
├── lib/                      # Cliente API, utilitários, formatação
├── pages/                    # Páginas do app (Dashboard, Transações, etc.)
├── stores/                   # Estados globais (Zustand)
└── types/                    # Tipos TypeScript

src-tauri/                    # Backend Rust (Tauri)
├── src/
│   ├── commands/             # Handlers dos comandos Tauri
│   ├── db/                   # Conexão, modelos, migrações
│   ├── lib.rs                # Setup do app (banco, comandos)
│   └── main.rs               # Entry point
├── icons/                    # Ícones do aplicativo
├── capabilities/             # Permissões do Tauri
└── tauri.conf.json           # Configuração do Tauri
```

## Licença

Distribuído sob licença MIT. Veja [LICENSE](LICENSE) para mais informações.

---

<p align="center">Desenvolvido por <a href="https://github.com/renato0x">renato0x</a></p>
