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

## Architecture
- Member data (birth info, coin wallet, unlocked readings, invite codes) is stored in Lovable Cloud and accessed only through server functions in `src/lib/user-fns.ts` (requireSupabaseAuth + RLS) — never direct client queries.
- Coin spending/granting happens exclusively in security-definer SQL functions (`spend_coins`, `apply_invite`); never update wallets from client code or ordinary queries.
- `src/start.ts` must keep `attachSupabaseAuth` in `functionMiddleware` so protected server functions receive the bearer token.
- Lunar→solar conversion runs only server-side in src/lib/lunar-conversion.server.ts (round-trip checked); the saju engine always receives the converted solar civil date — lunar-calendar ganji are never used as pillars.
