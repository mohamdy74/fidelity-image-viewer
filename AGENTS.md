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

## Project rules

- F1 data comes from the Jolpica Ergast API via `src/lib/f1-sync.functions.ts` (`syncF1Data`), throttled by the `sync_state` table — so page loads don't hammer the upstream API.
- The results endpoint caps responses at 100 rows; always page with `limit=100&offset=` until `MRData.total` is reached, or later rounds silently go missing.
- Scoring lives only in `src/lib/scoring.ts` and is applied server-side during sync — keeps points identical for every player and unforgeable from the client.
- Prediction deadlines are enforced by the `predictions_lock_guard` database trigger, not just UI state, so locks can't be bypassed.
- When the official results feed hasn't published a finished race (2.5h–4 days after start), `openF1Fallback` in `f1-sync.functions.ts` fills race_results from OpenF1; the official feed overwrites the same rows later — so scoring happens minutes after the flag.
