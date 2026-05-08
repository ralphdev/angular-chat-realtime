# Fase 1 — Infraestructura base

> Todo lo que debe existir antes de escribir una línea de código Angular.

## 1.2 Dependencias

```bash
npm i @supabase/supabase-js
npm i -D tailwindcss postcss autoprefixer prettier
```

## 1.3 Tailwind

[Angular + Tailwind](https://tailwindcss.com/docs/installation/framework-guides/angular)

## 1.4 Estructura de carpetas

```bash
mkdir -p src/app/core
mkdir -p src/app/features/auth
mkdir -p src/app/features/chat
mkdir -p src/app/features/profile
mkdir -p src/app/shared/models
mkdir -p src/environments
mkdir -p supabase/migrations
mkdir -p supabase/functions/send-push
mkdir -p docs
mkdir -p .claude/commands
```

## 1.5 Archivos de configuración

```bash
touch tailwind.config.js
touch postcss.config.js
touch src/environments/environment.ts
touch src/environments/environment.prod.ts
touch CLAUDE.md
```

## 1.6 Supabase local

```bash
npx supabase init
npx supabase login
npx supabase link --project-ref TU_PROJECT_ID
```

## 1.7 Schema base de datos

```bash
touch supabase/schema.sql
# Ejecutar en Supabase SQL Editor:

# - CREATE TABLE profiles (id, username, avatar_url, created_at)

# - CREATE TABLE messages (id, user_id, content, image_url, created_at)

# - RLS en ambas tablas

# - Storage bucket chat-images

# - Trigger handle_new_user (crea profile al registrarse)

# - Publication supabase_realtime
```

## 1.8 Tipos TypeScript desde el schema

```bash
touch src/app/shared/models/database.types.ts
# O generar automáticamente (requiere supabase start):

# bun run supabase:types
```
