import path from 'path';
import type { Location, TestError, } from '@playwright/test/reporter';
import { type Colors, webColors as realColors, noColors } from '../isomorphic/colors';
import { resolveReporterOutputPath, stripAnsiEscapes, parseErrorStack } from '../utils';

export type Screen = {
  resolveFiles: 'cwd' | 'rootDir';
  colors: Colors;
  isTTY: boolean;
  ttyWidth: number;
  ttyHeight: number;
  stdout?: NodeJS.WriteStream;
  stderr?: NodeJS.WriteStream;
};

export type TerminalScreen = Screen & {
  stdout: NodeJS.WriteStream;
  stderr: NodeJS.WriteStream;
};

type ErrorDetails = {
  message: string;
  location?: Location;
};

// eslint-disable-next-line no-restricted-properties
const originalProcessStdout = process.stdout;
// eslint-disable-next-line no-restricted-properties
const originalProcessStderr = process.stderr;

const DEFAULT_TTY_WIDTH = 100;
const DEFAULT_TTY_HEIGHT = 40;

// Output goes to terminal.
export const terminalScreen: TerminalScreen = (() => {
  let isTTY = !!originalProcessStdout.isTTY;
  let ttyWidth = originalProcessStdout.columns || 0;
  let ttyHeight = originalProcessStdout.rows || 0;
  if (process.env.PLAYWRIGHT_FORCE_TTY === 'false' || process.env.PLAYWRIGHT_FORCE_TTY === '0') {
    isTTY = false;
    ttyWidth = 0;
    ttyHeight = 0;
  } else if (process.env.PLAYWRIGHT_FORCE_TTY === 'true' || process.env.PLAYWRIGHT_FORCE_TTY === '1') {
    isTTY = true;
    ttyWidth = originalProcessStdout.columns || DEFAULT_TTY_WIDTH;
    ttyHeight = originalProcessStdout.rows || DEFAULT_TTY_HEIGHT;
  } else if (process.env.PLAYWRIGHT_FORCE_TTY) {
    isTTY = true;
    const sizeMatch = process.env.PLAYWRIGHT_FORCE_TTY.match(/^(\d+)x(\d+)$/);
    if (sizeMatch) {
      ttyWidth = +sizeMatch[1]!;
      ttyHeight = +sizeMatch[2]!;
    } else {
      ttyWidth = +process.env.PLAYWRIGHT_FORCE_TTY;
      ttyHeight = DEFAULT_TTY_HEIGHT;
    }
    if (isNaN(ttyWidth))
      ttyWidth = DEFAULT_TTY_WIDTH;
    if (isNaN(ttyHeight))
      ttyHeight = DEFAULT_TTY_HEIGHT;
  }

  let useColors = isTTY;
  if (process.env.DEBUG_COLORS === '0' || process.env.DEBUG_COLORS === 'false' ||
    process.env.FORCE_COLOR === '0' || process.env.FORCE_COLOR === 'false')
    useColors = false;
  else if (process.env.DEBUG_COLORS || process.env.FORCE_COLOR)
    useColors = true;

  const colors = useColors ? realColors : noColors;
  return {
    resolveFiles: 'cwd',
    isTTY,
    ttyWidth,
    ttyHeight,
    colors,
    stdout: originalProcessStdout,
    stderr: originalProcessStderr,
  };
})();

export function formatError(screen: Screen, error: TestError): ErrorDetails {
  const message = error.message || error.value || '';
  const stack = error.stack;
  if (!stack && !error.location)
    return { message };

  const tokens = [];

  // Now that we filter out internals from our stack traces, we can safely render
  // the helper / original exception locations.
  const parsedStack = stack ? prepareErrorStack(stack) : undefined;
  tokens.push(parsedStack?.message || message);

  if (error.snippet) {
    let snippet = error.snippet;
    if (!screen.colors.enabled)
      snippet = stripAnsiEscapes(snippet);
    tokens.push('');
    tokens.push(snippet);
  }

  if (parsedStack && parsedStack.stackLines.length)
    tokens.push(screen.colors.dim(parsedStack.stackLines.join('\n')));

  let location = error.location;
  if (parsedStack && !location)
    location = parsedStack.location;

  if (error.cause)
    tokens.push(screen.colors.dim('[cause]: ') + formatError(screen, error.cause).message);

  return {
    location,
    message: tokens.join('\n'),
  };
}

// Output does not go to terminal, but colors are controlled with terminal env vars.
export const nonTerminalScreen: Screen = {
  colors: terminalScreen.colors,
  isTTY: false,
  ttyWidth: 0,
  ttyHeight: 0,
  resolveFiles: 'rootDir',
};

export function prepareErrorStack(stack: string): {
  message: string;
  stackLines: string[];
  location?: Location;
} {
  return parseErrorStack(stack, path.sep, !!process.env.PWDEBUGIMPL);
}

function resolveFromEnv(name: string): string | undefined {
  const value = process.env[name];
  if (value)
    return path.resolve(process.cwd(), value);
  return undefined;
}

// In addition to `outputFile` the function returns `outputDir` which should
// be cleaned up if present by some reporters contract.
export function resolveOutputFile(reporterName: string, options: {
  configDir: string,
  outputDir?: string,
  fileName?: string,
  outputFile?: string,
  default?: {
    fileName: string,
    outputDir: string,
  }
}): { outputFile: string, outputDir?: string } | undefined {
  const name = reporterName.toUpperCase();
  let outputFile = resolveFromEnv(`PLAYWRIGHT_${name}_OUTPUT_FILE`);
  if (!outputFile && options.outputFile)
    outputFile = path.resolve(options.configDir, options.outputFile);
  if (outputFile)
    return { outputFile };

  let outputDir = resolveFromEnv(`PLAYWRIGHT_${name}_OUTPUT_DIR`);
  if (!outputDir && options.outputDir)
    outputDir = path.resolve(options.configDir, options.outputDir);
  if (!outputDir && options.default)
    outputDir = resolveReporterOutputPath(options.default.outputDir, options.configDir, undefined);
  if (!outputDir)
    outputDir = options.configDir;

  const reportName = process.env[`PLAYWRIGHT_${name}_OUTPUT_NAME`] ?? options.fileName ?? options.default?.fileName;
  if (!reportName)
    return undefined;
  outputFile = path.resolve(outputDir, reportName);

  return { outputFile, outputDir };
}

export type CommonReporterOptions = {
  configDir: string,
  _mode?: 'list' | 'test' | 'merge',
  _commandHash?: string,
};