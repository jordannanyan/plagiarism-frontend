export type ApiErrorShape = { ok?: false; message?: string };

export class ApiError extends Error {
  status: number;
  data?: any;
  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

type FetchJsonOptions = {
  method?: "GET" | "POST" | "DELETE" | "PUT" | "PATCH";
  token?: string | null;
  headers?: Record<string, string>;
  body?: any;
};

const DEFAULT_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL?.toString?.() || "";

function joinUrl(base: string, path: string) {
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

export async function fetchJson<T>(
  path: string,
  opts: FetchJsonOptions = {}
): Promise<T> {
  const url = joinUrl(DEFAULT_BASE, path);
  const headers: Record<string, string> = {
    ...(opts.headers ?? {}),
  };

  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  // If body is FormData, do NOT set content-type (browser will set boundary)
  const isFormData =
    typeof FormData !== "undefined" && opts.body instanceof FormData;

  if (opts.body != null && !isFormData) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers,
    body:
      opts.body == null
        ? undefined
        : isFormData
        ? (opts.body as FormData)
        : JSON.stringify(opts.body),
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  if (!res.ok) {
    const msg =
      (data && (data.message as string)) ||
      `Request failed (${res.status})`;
    throw new ApiError(res.status, msg, data);
  }

  return data as T;
}