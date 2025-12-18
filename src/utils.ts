import fs from 'fs';
import path from 'path';

export function readFileSafe(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

export function isIgnored(filePath: string, ignorePatterns: string[]): boolean {
  return ignorePatterns.some(pattern => filePath.includes(pattern));
}
