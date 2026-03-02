export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function toPascalCase(value: string): string {
  const cleaned = value
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');

  if (!cleaned) {
    return 'RocketChat';
  }

  return /^[0-9]/.test(cleaned) ? `App${cleaned}` : cleaned;
}

export function normalizePathForMatch(pathValue: string): string {
  return pathValue.replace(/\\/g, '/');
}
