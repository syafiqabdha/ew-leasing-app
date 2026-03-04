# AI Assistant / Agent Conventions & Memory

This file serves as a memory store for coding conventions, architectural patterns, and business rules within the **Engwah Leasing Portal**. Any AI agent (like Jules) operating in this repository MUST adhere to these guidelines.

## 1. Architectural Patterns
- **Frontend**: React + Vite + Tailwind CSS. Component-based architecture. Use `lucide-react` for icons. Markdown rendering is required for AI responses in the UI.
- **Backend**: Node.js + Express. REST API structure. Use `tsx` for execution.
- **Database**: PostgreSQL with `pgvector` for embedding support. Use **Drizzle ORM** for query building. Note: Currently using Drizzle `0.20.14`, do NOT attempt to upgrade to `0.30+` automatically due to breaking schema migration changes.

## 2. Security & Environment
- **Fail-Fast Environment Validation**: The application must fail immediately if essential variables (`DB_USER`, `DB_PASSWORD`, `JWT_SECRET`) are missing. Do not bypass the `env.ts` utility validation.
- **Role-Based Access Control (RBAC)**: Ensure endpoints respect the defined roles (`Sudo`, `Admin`, `Staff`, `Agent`). Sudo access is required for sensitive data mutations.
- **No Artifact Editing**: Never edit generated build artifacts (`dist`, `node_modules`). Always modify source code.

## 3. Tooling Restrictions
- Do not run `npm update` or force `npm audit fix --force` on the backend without explicit user permission, as breaking dependency chains (especially `drizzle-kit`) cause migration failures.
- The `node_modules` cache might sometimes fail `npm ci` due to local restrictions. If required, use `npm install --no-audit` or troubleshoot carefully.

## 4. Feature: Eva (AI Analyst)
- Eva is a Senior Commercial Leasing Analyst. Keep its tone professional and concise.
- AI must always respect rate limits (50 requests/hour).
- Rich text (Markdown) is expected for technical breakdowns.

*By enforcing these conventions, the AI guarantees a secure, stable, and predictable environment for contributors.*
