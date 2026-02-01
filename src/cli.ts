#!/usr/bin/env node
import "dotenv/config";
import { readFile } from "fs/promises";
import { PublerApiError, PublerClient, PublerQuery } from "./client";

type ArgMap = Record<string, string | boolean>;

function parseArgs(argv: string[]) {
  const flags: ArgMap = {};
  const positionals: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i += 1;
      } else {
        flags[key] = true;
      }
    } else {
      positionals.push(arg);
    }
  }

  return { flags, positionals };
}

function readJsonFlag(flags: ArgMap, key: string): unknown | undefined {
  const value = flags[key];
  if (!value || typeof value !== "string") {
    return undefined;
  }
  return JSON.parse(value);
}

async function readJsonFileFlag(flags: ArgMap, key: string): Promise<unknown | undefined> {
  const value = flags[key];
  if (!value || typeof value !== "string") {
    return undefined;
  }
  const contents = await readFile(value, "utf8");
  return JSON.parse(contents);
}

function getStringFlag(flags: ArgMap, key: string): string | undefined {
  const value = flags[key];
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return undefined;
}

function printJson(payload: unknown) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function printHelp() {
  const text = `Publer CLI (non-interactive)

Usage:
  publer me
  publer workspaces
  publer accounts --workspace <id>
  publer posts --workspace <id> [--state scheduled] [--query '{"limit": 10}']
  publer job-status <jobId> --workspace <id>
  publer schedule-post --workspace <id> --json-file ./payload.json
  publer request --method GET --path /me

Global flags:
  --token <token>           Defaults to PUBLER_API_TOKEN
  --workspace <id>          Defaults to PUBLER_WORKSPACE_ID
  --base-url <url>          Defaults to PUBLER_BASE_URL or https://app.publer.com/api/v1

Request flags:
  --method <method>         HTTP method (GET, POST, ...)
  --path <path>             API path like /workspaces
  --query <json>            JSON object for query parameters
  --json <json>             JSON body
  --json-file <path>        JSON body from a file
`;

  process.stdout.write(text);
}

async function run() {
  const { flags, positionals } = parseArgs(process.argv.slice(2));
  const command = positionals[0] ?? "help";

  if (command === "help" || command === "-h" || command === "--help") {
    printHelp();
    return;
  }

  const token = getStringFlag(flags, "token") ?? process.env.PUBLER_API_TOKEN;
  const workspaceId =
    getStringFlag(flags, "workspace") ?? process.env.PUBLER_WORKSPACE_ID ?? undefined;
  const baseUrl = getStringFlag(flags, "base-url") ?? process.env.PUBLER_BASE_URL ?? undefined;

  if (!token) {
    throw new Error("Missing API token. Provide --token or PUBLER_API_TOKEN.");
  }

  const client = new PublerClient({ token, workspaceId, baseUrl });

  switch (command) {
    case "me": {
      const payload = await client.me();
      printJson(payload);
      return;
    }
    case "workspaces": {
      const payload = await client.listWorkspaces();
      printJson(payload);
      return;
    }
    case "accounts": {
      if (!workspaceId) {
        throw new Error("Missing workspace id. Provide --workspace or PUBLER_WORKSPACE_ID.");
      }
      const payload = await client.listAccounts();
      printJson(payload);
      return;
    }
    case "posts": {
      if (!workspaceId) {
        throw new Error("Missing workspace id. Provide --workspace or PUBLER_WORKSPACE_ID.");
      }
      const query: PublerQuery = {};
      const state = getStringFlag(flags, "state");
      if (state) {
        query.state = state;
      }
      const extraQuery = readJsonFlag(flags, "query");
      if (extraQuery && typeof extraQuery === "object" && !Array.isArray(extraQuery)) {
        Object.assign(query, extraQuery);
      }
      const payload = await client.listPosts(Object.keys(query).length ? query : undefined);
      printJson(payload);
      return;
    }
    case "job-status": {
      if (!workspaceId) {
        throw new Error("Missing workspace id. Provide --workspace or PUBLER_WORKSPACE_ID.");
      }
      const jobId = getStringFlag(flags, "job-id") ?? positionals[1];
      if (!jobId) {
        throw new Error("Missing job id. Provide job id positional or --job-id.");
      }
      const payload = await client.getJobStatus(jobId);
      printJson(payload);
      return;
    }
    case "schedule-post": {
      if (!workspaceId) {
        throw new Error("Missing workspace id. Provide --workspace or PUBLER_WORKSPACE_ID.");
      }
      const jsonBody =
        (await readJsonFileFlag(flags, "json-file")) ?? readJsonFlag(flags, "json");
      if (!jsonBody) {
        throw new Error("Missing payload. Provide --json or --json-file.");
      }
      const payload = await client.schedulePost(jsonBody as Record<string, unknown>);
      printJson(payload);
      return;
    }
    case "request": {
      const method = getStringFlag(flags, "method");
      const path = getStringFlag(flags, "path");
      if (!method || !path) {
        throw new Error("Missing --method or --path for request.");
      }
      const query = readJsonFlag(flags, "query");
      const body =
        (await readJsonFileFlag(flags, "json-file")) ?? readJsonFlag(flags, "json");
      const payload = await client.request(method.toUpperCase(), path, {
        query: query && typeof query === "object" && !Array.isArray(query) ? (query as PublerQuery) : undefined,
        body
      });
      printJson(payload);
      return;
    }
    default: {
      throw new Error(`Unknown command: ${command}`);
    }
  }
}

run().catch((error) => {
  if (error instanceof PublerApiError) {
    process.stderr.write(`${error.message}\n`);
    if (error.response) {
      process.stderr.write(`${JSON.stringify(error.response, null, 2)}\n`);
    }
  } else if (error instanceof Error) {
    process.stderr.write(`${error.message}\n`);
  } else {
    process.stderr.write("Unexpected error\n");
  }
  process.exit(1);
});
