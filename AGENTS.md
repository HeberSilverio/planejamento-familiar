<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Payment status per occurrence: one-off expenses use `transactions.paid`; monthly occurrences of recurring/commitments/debts are paid when a row exists in `obligation_payments` (source_type, source_id, month_key). Why: paying one month must never mark another, and no rows need pre-generating.
- All income/balance/due-date math lives in `src/lib/finance/engine.ts` (tested in `src/test/finance-engine.test.tsx`); screens must not compute totals themselves. Why: Dashboard, Família and Planejamento must always agree.
