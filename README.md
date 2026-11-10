# PediFlux

**Gestão Inteligente para sua Clínica Pediátrica.** Agenda, prontuário com modelos de puericultura, curva de crescimento automática (percentil e escore Z), exames e portal da família.

> Versão de demonstração: frontend completo com dados fictícios em memória (`src/data/mock.ts`). As telas só conversam com `src/data/store.ts`, então trocar por um banco real (Supabase) não exige reescrever a interface.

## Telas

| Rota             | O que é                                                                          |
| ---------------- | -------------------------------------------------------------------------------- |
| `/`              | Login (qualquer e-mail/senha na demo)                                            |
| `/hoje`          | Painel do dia: agenda, pedidos do link público, alertas de crescimento, retornos |
| `/agenda`        | Agenda dia/semana, bloqueios, lembrete por WhatsApp                              |
| `/pacientes`     | Lista com busca, filtros por faixa etária e irmãos                               |
| `/pacientes/:id` | Ficha: resumo, consultas (prontuário), crescimento, exames                       |
| `/configuracoes` | Perfil, horários, link público, mensagens, assinatura                            |
| `/agendar/:slug` | Agendamento público para as famílias (ex.: `/agendar/dra-marina`)                |
| `/p/:token`      | Portal da família por link (ex.: `/p/abc123`)                                    |

## Rodar localmente

```sh
bun install   # ou npm install
bun run dev   # ou npm run dev
```

## Deploy no Netlify

Já configurado em `netlify.toml` (build `npm run build`, publish `dist`, Node 22, preset Nitro `netlify`).
No Netlify: **Add new site → Import from Git → escolher este repositório** e publicar. Nada mais a configurar.

## Marca

Logo oficial em `public/brand/` (gerada a partir do arquivo original da marca). O componente `src/components/pediflux/Logo.tsx` centraliza o uso: `Logo` (horizontal, `tagline` para a versão com slogan, `onDark` para fundos escuros) e `LogoMark` (ícone, `tile` para fundos coloridos).

## Observações

- Curvas de crescimento usam valores **aproximados** de demonstração (`src/data/growth-reference.ts`); trocar pelas tabelas LMS oficiais da OMS antes de uso clínico.
- WhatsApp funciona só por link `wa.me` (sem API paga).
