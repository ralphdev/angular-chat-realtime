# Fase 2 — Autenticación

> Nada del resto funciona sin auth. Esta fase entrega un login funcional completo.

```bash
# ── 2.1 Core services ─────────────────────────────────────────
ng g s core/supabase --skip-tests
ng g s core/auth --skip-tests
ng g guard core/auth --functional --skip-tests

# ── 2.2 Componentes de auth ───────────────────────────────────
ng generate component features/auth \
--standalone --change-detection OnPush \
--skip-tests --inline-template --inline-style

ng generate component features/auth/auth-callback \
--standalone --change-detection OnPush \
--skip-tests --inline-template --inline-style

ng generate component features/auth/reset-password \
--standalone --change-detection OnPush \
--skip-tests --inline-template --inline-style

# ── 2.3 Migración OAuth ───────────────────────────────────────
touch supabase/migrations/013_oauth_handle_user.sql
npx supabase db push

# ── 2.4 Documentación OAuth ───────────────────────────────────
touch docs/oauth-setup.md
```
