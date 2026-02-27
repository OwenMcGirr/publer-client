# Publer Client - AI Usage Guide

This project is a non-interactive TypeScript client + CLI for Publer's API. It is designed for automation and agent usage (no prompts).

## Quick Start (CLI)

```bash
cd /home/owen-mcgirr/source/publer-client
npm install
npm run build
```

## Required Auth

- `Authorization: Bearer-API <token>`
- Base URL: `https://app.publer.com/api/v1`
- `Publer-Workspace-Id` header is required for most endpoints.

Environment variables (the CLI loads `.env` automatically):

- `PUBLER_API_TOKEN`
- `PUBLER_WORKSPACE_ID`
- `PUBLER_BASE_URL` (optional)

## Canonical Endpoints

- `GET /users/me` (user profile)
- `GET /workspaces`
- `GET /accounts`
- `POST /posts/schedule`
- `GET /job_status/:jobId`
- `GET /posts?state=scheduled`
- `POST /media` (upload media file, multipart/form-data)
- `GET /media` (list media library)

## CLI Commands (Non-Interactive)

The CLI never prompts. All inputs come from flags or env vars.

```bash
publer me
publer workspaces
publer accounts --workspace <workspace_id>
publer posts --workspace <workspace_id> --state scheduled
publer job-status <job_id> --workspace <workspace_id>
publer schedule-post --workspace <workspace_id> --json-file ./payload.json
publer upload-media --workspace <workspace_id> --file ./image.jpg [--in-library] [--direct-upload]
publer list-media --workspace <workspace_id> [--types photo,video,gif] [--page 0] [--search text] [--ids id1,id2]
publer request --method GET --path /users/me
```

All commands also work with env vars instead of flags:

```bash
PUBLER_API_TOKEN=... PUBLER_WORKSPACE_ID=... node dist/cli.js workspaces
```

## Scheduling a Post (Example Payload)

Create `payload.json`:

```json
{
  "bulk": {
    "state": "scheduled",
    "posts": [
      {
        "networks": {
          "linkedin": {
            "type": "status",
            "text": "Hello from Switchify"
          }
        },
        "accounts": [
          {
            "id": "ACCOUNT_ID",
            "scheduled_at": "2026-02-01T15:24:46+00:00"
          }
        ]
      }
    ]
  }
}
```

Schedule the post:

```bash
PUBLER_API_TOKEN=... node dist/cli.js schedule-post --workspace <workspace_id> --json-file ./payload.json
```

The API returns a `job_id`. Poll until complete:

```bash
PUBLER_API_TOKEN=... node dist/cli.js job-status <job_id> --workspace <workspace_id>
```

## Library Usage (TypeScript)

```ts
import { PublerClient } from "publer-client";

const client = new PublerClient({
  token: process.env.PUBLER_API_TOKEN!,
  workspaceId: process.env.PUBLER_WORKSPACE_ID
});

const me = await client.me();
const workspaces = await client.listWorkspaces();
```

## Uploading Media (Example)

Upload a local file to the media library:

```bash
PUBLER_API_TOKEN=... node dist/cli.js upload-media --workspace <workspace_id> --file ./image.jpg --in-library
```

The MIME type is auto-detected from the file extension. Supported extensions: `jpg`/`jpeg`, `png`, `gif`, `webp`, `mp4`, `mov`, `avi`, `webm`, `pdf`. Unknown extensions fall back to `application/octet-stream`.

The response includes an `id` that can be referenced in post payloads:

```json
{
  "media": [
    {
      "id": "<media_id>",
      "type": "image",
      "alt_text": "Descriptive text"
    }
  ]
}
```

List media with optional filters:

```bash
PUBLER_API_TOKEN=... node dist/cli.js list-media --workspace <workspace_id> --types photo,video --page 0
```

## Notes

- API access is limited to Publer Business/Enterprise accounts.
- Errors are returned as `PublerApiError` with `status` and `response`.
- Use the generic `request` command for unsupported endpoints.
