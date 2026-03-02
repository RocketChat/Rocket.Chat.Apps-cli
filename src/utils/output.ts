type ColorName = 'blue' | 'green' | 'yellow' | 'red' | 'gray';

let chalkRef: any;

try {
  // Optional runtime dependency: fall back to plain text if missing.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const chalkModule = require('chalk');
  chalkRef = chalkModule.default ?? chalkModule;
} catch {
  chalkRef = undefined;
}

function colorize(color: ColorName, value: string): string {
  const fn = chalkRef && typeof chalkRef[color] === 'function' ? chalkRef[color] : undefined;
  return fn ? fn(value) : value;
}

function bold(value: string): string {
  const fn = chalkRef && chalkRef.bold;
  return typeof fn === 'function' ? fn(value) : value;
}

export function step(message: string): void {
  console.log(`${colorize('blue', '[*]')} ${message}`);
}

export function success(message: string): void {
  console.log(`${colorize('green', '[+]')} ${message}`);
}

export function warn(message: string): void {
  console.warn(`${colorize('yellow', '[!]')} ${message}`);
}

export function failure(message: string): void {
  console.error(`${colorize('red', '[-]')} ${message}`);
}

export function info(message: string): void {
  console.log(message);
}

export function verbose(enabled: boolean, message: string): void {
  if (!enabled) {
    return;
  }

  console.log(`${colorize('gray', '[v]')} ${message}`);
}

export function heading(message: string): void {
  console.log(bold(message));
}
