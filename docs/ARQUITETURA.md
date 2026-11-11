# Arquitetura do PediFlux

Sistema **de prateleira**: um único código e um único banco atendem todas as clínicas.
Nenhum cliente recebe customização — o que muda entre eles é só o **plano** e as
**configurações da própria clínica** (nome, horários, mensagens, link).

```
Navegador (PWA: médico, mãe, link público)
   │  chave publicável (pública) — a segurança está no banco
   ▼
Supabase
 ├─ Auth ........ login do médico (e-mail + senha / link mágico)
 ├─ Postgres .... tabelas com RLS por clinic_id + RPCs públicas
 ├─ Storage ..... bucket privado "exams" (pasta por clínica)
 └─ Edge Functions (próximo passo)
      ├─ billing-webhook ... Monetizze/Hotmart → ativa/cancela assinatura
      └─ portal-file ....... URL assinada de exame para o portal da mãe
Netlify ......... hospeda o front (build estático + função SSR)
```

## Multi-tenant

- `clinics` é o cliente. `clinic_members` liga usuários do Auth à clínica (papéis
  `owner`, `doctor`, `secretary`). v1 = uma clínica por conta.
- Toda tabela de dados tem `clinic_id`, e as chaves estrangeiras são compostas
  `(clinic_id, id)`: é impossível um registro apontar para dado de outra clínica.
- `subscriptions` guarda plano e status. Só o servidor escreve nela.

## Tabelas

| Tabela             | O que guarda                                      | Exclusão       |
| ------------------ | ------------------------------------------------- | -------------- |
| `families`         | responsável + telefone (irmãos compartilham)      | não            |
| `patients`         | criança, nascimento, alergias, próximo retorno    | não            |
| `consultations`    | prontuário + sinais vitais + `shared_with_family` | não            |
| `measurements`     | peso, altura, PC por data (curva de crescimento)  | não            |
| `appointments`     | agenda                                            | sim            |
| `time_blocks`      | bloqueios de horário                              | sim            |
| `booking_requests` | pedidos do link público                           | só muda status |
| `exam_files`       | metadados do arquivo no Storage                   | sim            |
| `portal_links`     | token do portal da família (1 ativo por família)  | revoga         |

Prontuário não se exclui (guarda legal de 20 anos — CFM). Cancelou a assinatura,
a clínica continua **lendo** tudo, só não grava; nada é apagado.

## Regras de acesso (RLS)

| Quem                                                              | Pode                                       |
| ----------------------------------------------------------------- | ------------------------------------------ |
| Membro da clínica                                                 | ler tudo da própria clínica                |
| Membro + assinatura em dia (`trial` válido, `active`, `past_due`) | criar/editar                               |
| Outra clínica                                                     | nada (testado)                             |
| Anônimo                                                           | nenhuma tabela; só as RPCs públicas abaixo |

## Planos (fonte única: `private.plan_allows` e `private.plan_storage_bytes`)

| Recurso                            | Essencial | Plus  | Pro    |
| ---------------------------------- | --------- | ----- | ------ |
| Agenda, prontuário, curvas, exames | ✔         | ✔     | ✔      |
| Portal da família                  | —         | ✔     | ✔      |
| Relatórios                         | —         | ✔     | ✔      |
| Modelos de prontuário próprios     | —         | —     | ✔      |
| Armazenamento                      | 5 GB      | 20 GB | 100 GB |

Teste grátis: 7 dias no plano Pro, criado automaticamente no cadastro.

## RPCs

| Função                              | Quem chama             | Faz                                                  |
| ----------------------------------- | ---------------------- | ---------------------------------------------------- |
| `create_clinic(nome, slug, médico)` | médico logado (1ª vez) | cria clínica + dono + trial                          |
| `public_booking_info(slug)`         | anônimo                | dados públicos + horários ocupados (sem nomes)       |
| `create_booking_request(...)`       | anônimo                | valida expediente, conflito e anti-spam; cria pedido |
| `portal_snapshot(token)`            | anônimo com token      | tudo que a família pode ver (só o compartilhado)     |
| `portal_exam_path(token, exame)`    | só servidor            | caminho do arquivo para URL assinada                 |

## Cobrança (Mercado Pago · Assinaturas)

Aplicação **PediFlux** no Mercado Pago (id 1490964653264128), solução _Assinaturas_.

```
/planos (lê billing_plans) → link do plano (preapproval_plan) → cliente paga no MP
   → webhook "Planos e assinaturas" → Edge Function mp-webhook
   → valida x-signature (HMAC) → consulta GET /preapproval/{id} → billing_apply()
   → purchases + subscriptions (plano, status, próximo vencimento)
```

- **Vínculo compra ↔ clínica = e-mail.** Comprou antes de criar a conta: `create_clinic`
  já cria a clínica com o plano pago (sem trial). Comprou depois: `billing_apply` atualiza.
- **Estados:** `authorized` → active · `paused` → past_due (ainda grava) · `cancelled` →
  canceled (somente leitura, nada é apagado).
- **Catálogo:** `billing_plans` (6 planos: Essencial/Plus/Pro × mensal/anual) com `mp_plan_id`
  e `checkout_url`. Trocar preço = criar novo plano no MP e atualizar a linha.
- **Segredos** (Supabase → Edge Functions → Secrets): `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`.
  Nunca no repositório nem no front.
- **Modo atual: TESTE.** As credenciais são de uma conta de teste do Mercado Pago. Para vender
  de verdade: ativar _Credenciais de produção_ no painel (dados do negócio), trocar
  `MP_ACCESS_TOKEN`, cadastrar a URL também em _Modo de produção_ dos Webhooks (gera outra
  assinatura secreta → trocar `MP_WEBHOOK_SECRET`) e recriar os planos com o token de produção.
- `back_url` dos planos aponta para `https://pediflux.netlify.app/obrigado` (provisório):
  atualizar com o domínio real (PUT /preapproval_plan/{id}).

## Ambientes

| Ambiente        | Projeto                | Região                                                      |
| --------------- | ---------------------- | ----------------------------------------------------------- |
| Desenvolvimento | `fopzgyrzsnkujajtydhj` | us-east-2 (EUA)                                             |
| Produção        | a criar                | **sa-east-1 (São Paulo)** — dados de saúde perto do cliente |

As migrations em `supabase/migrations/` recriam tudo em qualquer projeto novo.
Variáveis do front: ver `.env.example` (configurar também no Netlify).

## Próximos passos

0. Domínio final do Netlify → atualizar `back_url` dos planos e o Site URL do Supabase Auth.
1. Trocar a camada mock (`src/data/store.ts`) por Supabase, mantendo as mesmas telas.
2. Login real + tela de primeiro acesso (`create_clinic`).
3. Edge Functions `billing-webhook` e `portal-file`.
4. Projeto de produção em São Paulo + backups (plano Pro do Supabase).
