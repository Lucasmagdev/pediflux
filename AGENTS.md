<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Regras do projeto PediFlux (prevalecem sobre o bloco acima)

- **Banco de dados é nosso, não do Lovable.** O PediFlux usa um projeto Supabase próprio.
  O esquema vive em `supabase/migrations/` neste repositório e é a fonte da verdade —
  crie uma nova migration para cada mudança (nunca edite uma já aplicada).
  Depois de mudar o esquema, regenere `src/integrations/supabase/types.ts`.
- **Sistema de prateleira.** Um único banco e um único código para todas as clínicas.
  Nada de customização por cliente: o que varia é só o plano (`plan_allows` em
  `supabase/migrations/*_rls.sql`) e as configurações da própria clínica.
- **Segurança:** toda tabela tem RLS; acesso público só por RPC `security definer`.
  Prontuário (pacientes, famílias, consultas, medidas) não pode ser excluído.
- **Segredos:** nunca versionar `.env.local`, service role key nem tokens de acesso.
- Arquitetura detalhada: `docs/ARQUITETURA.md`.
