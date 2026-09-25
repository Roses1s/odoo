export function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && "results" in data) {
    return (data as { results: T[] }).results;
  }
  return [];
}

export function apiErrorMessage(error: unknown, fallback = "Ошибка запроса"): string {
  if (typeof error === "object" && error && "response" in error) {
    const data = (error as { response?: { data?: unknown } }).response?.data;
    if (typeof data === "string") return data;
    if (data && typeof data === "object") {
      const rec = data as Record<string, unknown>;
      if (typeof rec.detail === "string") return rec.detail;
      const first = Object.values(rec)[0];
      if (typeof first === "string") return first;
      if (Array.isArray(first) && typeof first[0] === "string") return first[0];
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
