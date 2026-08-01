// Versions are X.X.X-tag; the tag is informational and ignored by comparisons.
export function compareVersions(a: string, b: string): number {
  const parse = (v: string): [number, number, number] => {
    const m = String(v).trim().match(/^(\d+)\.(\d+)\.(\d+)/);
    return m
      ? [
          Number.parseInt(m[1], 10),
          Number.parseInt(m[2], 10),
          Number.parseInt(m[3], 10),
        ]
      : [0, 0, 0];
  };
  const av = parse(a);
  const bv = parse(b);
  for (let i = 0; i < 3; i++) {
    if (av[i] !== bv[i]) return av[i] - bv[i];
  }
  return 0;
}
