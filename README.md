# Publer Client (TypeScript)

Non-interactive TypeScript client and CLI for the Publer API.

AI-focused usage guide: `AI.md`.

## Requirements

- Node.js >= 18
- Publer Business or Enterprise account

## Setup

```bash
npm install
cp .env.example .env
npm run build
```

Then open `.env` and replace the placeholder values for `PUBLER_API_TOKEN` and `PUBLER_WORKSPACE_ID`.

## Add CLI to PATH

Option 1: use `npm link` (recommended):

```bash
cd /home/owen-mcgirr/source/publer-client
npm link
```

Option 2: add the project bin to your PATH (bash/zsh):

```bash
export PATH="/home/owen-mcgirr/source/publer-client/dist:$PATH"
```

Environment variables (see `.env.example`):

- `PUBLER_API_TOKEN`
- `PUBLER_WORKSPACE_ID` (required for most endpoints)
- `PUBLER_BASE_URL` (optional, defaults to `https://app.publer.com/api/v1`)

## CLI Usage (Non-Interactive)

```bash
publer me
publer workspaces
publer accounts --workspace <id>
publer posts --workspace <id> --state scheduled
publer job-status <jobId> --workspace <id>
publer schedule-post --workspace <id> --json-file ./payload.json
publer request --method GET --path /users/me
```

All flags can also be passed via env vars. The CLI never prompts for input.

## Library Usage

```ts
import { PublerClient } from "publer-client";

const client = new PublerClient({
  token: process.env.PUBLER_API_TOKEN!,
  workspaceId: process.env.PUBLER_WORKSPACE_ID
});

const workspaces = await client.listWorkspaces();
console.log(workspaces);
```

## Notes

- Authentication uses the `Authorization: Bearer-API <token>` header.
- Most endpoints require `Publer-Workspace-Id`.
- See https://publer.com/docs for full API reference and payloads.
