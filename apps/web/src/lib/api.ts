export const EVENT_REVALIDATE_SECONDS = 120;

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export function apiUrl(): string {
  return (process.env.API_URL ?? "http://localhost:8080").replace(/\/$/, "");
}

export async function apiGet<T>(path: string): Promise<T> {
  const url = `${apiUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  let response: Response;

  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: EVENT_REVALIDATE_SECONDS },
    });
  } catch (error) {
    console.error("[api] network error", { path, error });
    throw new ApiRequestError("No pudimos hablar con Parche", 0, path);
  }

  if (response.status === 404 || response.status === 410) {
    throw new ApiRequestError(`API ${response.status}`, response.status, path);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("[api] request failed", {
      path,
      status: response.status,
      body: body.slice(0, 200),
    });
    throw new ApiRequestError(`API ${response.status}`, response.status, path);
  }

  return (await response.json()) as T;
}
