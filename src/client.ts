export type PublerQuery = Record<string, string | number | boolean | string[] | undefined>;

export interface PublerClientOptions {
  token: string;
  workspaceId?: string;
  baseUrl?: string;
}

export class PublerApiError extends Error {
  status: number;
  response: unknown;

  constructor(message: string, status: number, response: unknown) {
    super(message);
    this.name = "PublerApiError";
    this.status = status;
    this.response = response;
  }
}

export interface PublerWorkspace {
  id: string;
  name: string;
  role?: string;
  picture?: string;
}

export interface PublerAccount {
  id: string;
  name: string;
  provider: string;
  type?: string;
  picture?: string;
  status?: string;
}

export interface PublerJobStatus {
  status: string;
  payload?: Record<string, unknown>;
  plan?: Record<string, unknown>;
}

export interface PublerMedia {
  id: string;
  type: string;
  name?: string;
  caption?: string;
  path: string;
  thumbnails?: Record<string, string>;
  created_at?: string;
  updated_at?: string;
  favorite?: boolean;
  in_library?: boolean;
  width?: number;
  height?: number;
  source?: string;
  validity?: Record<string, unknown>;
}

export interface PublerMediaListResponse {
  media: PublerMedia[];
  total: number;
}

export interface PublerUploadMediaOptions {
  inLibrary?: boolean;
  directUpload?: boolean;
}

export interface PublerListMediaParams {
  page?: number;
  types?: string[];
  ids?: string[];
  search?: string;
}

export interface PublerRequestOptions {
  query?: PublerQuery;
  body?: unknown;
  workspaceId?: string;
}

export class PublerClient {
  private token: string;
  private workspaceId?: string;
  private baseUrl: string;

  constructor(options: PublerClientOptions) {
    this.token = options.token;
    this.workspaceId = options.workspaceId;
    this.baseUrl = options.baseUrl ?? "https://app.publer.com/api/v1";
  }

  async request<T>(method: string, path: string, options: PublerRequestOptions = {}): Promise<T> {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${normalizedPath}`);

    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value === undefined) continue;
        if (Array.isArray(value)) {
          for (const item of value) {
            url.searchParams.append(`${key}[]`, item);
          }
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer-API ${this.token}`
    };

    const effectiveWorkspaceId = options.workspaceId ?? this.workspaceId;
    if (effectiveWorkspaceId) {
      headers["Publer-Workspace-Id"] = effectiveWorkspaceId;
    }

    let body: string | FormData | undefined;
    if (options.body !== undefined) {
      if (options.body instanceof FormData) {
        body = options.body;
        // Don't set Content-Type — fetch sets it with the correct multipart boundary
      } else {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(options.body);
      }
    }

    const response = await fetch(url, {
      method,
      headers,
      body
    });

    const text = await response.text();
    let payload: unknown = undefined;

    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }

    if (!response.ok) {
      throw new PublerApiError(
        `Publer API error (${response.status} ${response.statusText})`,
        response.status,
        payload
      );
    }

    return payload as T;
  }

  get<T>(path: string, options?: PublerRequestOptions): Promise<T> {
    return this.request<T>("GET", path, options);
  }

  post<T>(path: string, body?: unknown, options?: Omit<PublerRequestOptions, "body">): Promise<T> {
    return this.request<T>("POST", path, { ...options, body });
  }

  put<T>(path: string, body?: unknown, options?: Omit<PublerRequestOptions, "body">): Promise<T> {
    return this.request<T>("PUT", path, { ...options, body });
  }

  patch<T>(path: string, body?: unknown, options?: Omit<PublerRequestOptions, "body">): Promise<T> {
    return this.request<T>("PATCH", path, { ...options, body });
  }

  delete<T>(path: string, options?: PublerRequestOptions): Promise<T> {
    return this.request<T>("DELETE", path, options);
  }

  me(): Promise<Record<string, unknown>> {
    return this.get("/users/me");
  }

  listWorkspaces(): Promise<PublerWorkspace[]> {
    return this.get("/workspaces");
  }

  listAccounts(): Promise<{ accounts: PublerAccount[] } | PublerAccount[]> {
    return this.get("/accounts", { workspaceId: this.workspaceId });
  }

  schedulePost(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post("/posts/schedule", payload, { workspaceId: this.workspaceId });
  }

  getJobStatus(jobId: string): Promise<PublerJobStatus> {
    return this.get(`/job_status/${jobId}`, { workspaceId: this.workspaceId });
  }

  listPosts(query?: PublerQuery): Promise<Record<string, unknown>> {
    return this.get("/posts", { query, workspaceId: this.workspaceId });
  }

  uploadMedia(file: Blob, filename: string, options: PublerUploadMediaOptions = {}): Promise<PublerMedia> {
    const form = new FormData();
    form.append("file", file, filename);
    if (options.inLibrary !== undefined) {
      form.append("in_library", String(options.inLibrary));
    }
    if (options.directUpload !== undefined) {
      form.append("direct_upload", String(options.directUpload));
    }
    return this.post<PublerMedia>("/media", form, { workspaceId: this.workspaceId });
  }

  listMedia(params?: PublerListMediaParams): Promise<PublerMediaListResponse> {
    const query: PublerQuery = {};
    if (params?.page !== undefined) query.page = params.page;
    if (params?.types?.length) query.types = params.types;
    if (params?.ids?.length) query.ids = params.ids;
    if (params?.search) query.search = params.search;
    return this.get("/media", { query, workspaceId: this.workspaceId });
  }
}
