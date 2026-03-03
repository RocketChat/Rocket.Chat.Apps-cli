import { normalizePathForMatch } from './strings';

function escapeRegexCharacter(value: string): string {
  return /[|\\{}()[\]^$+?.]/.test(value) ? `\\${value}` : value;
}

export function globToRegex(pattern: string): RegExp {
  const normalized = normalizePathForMatch(pattern);
  let regex = '';

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];

    if (char === '*') {
      const nextChar = normalized[index + 1];

      if (nextChar === '*') {
        const nextNextChar = normalized[index + 2];

        if (nextNextChar === '/') {
          // `**/` should match zero or more path segments.
          regex += '(?:.*/)?';
          index += 2;
        } else {
          regex += '.*';
          index += 1;
        }
      } else {
        regex += '[^/]*';
      }

      continue;
    }

    regex += escapeRegexCharacter(char);
  }

  return new RegExp(`^${regex}$`);
}

export function buildGlobMatcher(patterns: string[]): (candidate: string) => boolean {
  const regexes = patterns.map((pattern) => globToRegex(pattern));

  return (candidate: string) => {
    const normalized = normalizePathForMatch(candidate);
    return regexes.some((regex) => regex.test(normalized));
  };
}
