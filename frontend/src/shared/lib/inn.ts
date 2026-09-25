export function normalizeInn(inn: string): string {
  return (inn || "").replace(/\D/g, "");
}

export function innChecksumOk(raw: string): boolean {
  const inn = normalizeInn(raw);
  if (inn.length === 10) {
    const c = [2, 4, 10, 3, 5, 9, 4, 6, 8];
    const control = c.reduce((s, k, i) => s + Number(inn[i]) * k, 0) % 11 % 10;
    return control === Number(inn[9]);
  }
  if (inn.length === 12) {
    const c11 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
    const c12 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
    const n11 = c11.reduce((s, k, i) => s + Number(inn[i]) * k, 0) % 11 % 10;
    const n12 = c12.reduce((s, k, i) => s + Number(inn[i]) * k, 0) % 11 % 10;
    return n11 === Number(inn[10]) && n12 === Number(inn[11]);
  }
  return false;
}
