/** Minimal Content-Security-Policy parser and weakness check (no network, unit-tested offline). */

export type CspPolicy = ReadonlyMap<string, readonly string[]>;

/** Splits a policy into directives. Per spec, the first occurrence of a directive wins. */
export function parseCsp(header: string): CspPolicy {
  const policy = new Map<string, string[]>();
  for (const part of header.toLowerCase().split(';')) {
    const [name, ...sources] = part.trim().split(/\s+/);
    if (name !== undefined && name !== '' && !policy.has(name)) policy.set(name, sources);
  }
  return policy;
}

const WEAK_SCRIPT_SOURCES = ["'unsafe-eval'", '*', 'data:', 'http:'];

/** Returns why the policy does not protect against script injection or framing; [] means none found. */
export function cspWeaknesses(header: string): string[] {
  const policy = parseCsp(header);
  const problems: string[] = [];

  const scripts = policy.get('script-src') ?? policy.get('default-src');
  if (scripts === undefined) {
    problems.push('neither script-src nor default-src is set');
  } else {
    for (const source of WEAK_SCRIPT_SOURCES) {
      if (scripts.includes(source)) problems.push(`script sources allow ${source}`);
    }
    // A nonce, a hash or 'strict-dynamic' makes browsers ignore 'unsafe-inline'.
    const neutralised = scripts.some(
      (source) =>
        source.startsWith("'nonce-") || source.startsWith("'sha") || source === "'strict-dynamic'",
    );
    if (scripts.includes("'unsafe-inline'") && !neutralised) {
      problems.push("script sources allow 'unsafe-inline' without a nonce or hash");
    }
  }
  if (!policy.has('object-src') && !policy.has('default-src')) {
    problems.push('object-src is not restricted');
  }
  if (!policy.has('base-uri')) problems.push('base-uri is not set');
  if (!policy.has('frame-ancestors')) problems.push('frame-ancestors is not set');
  return problems;
}
