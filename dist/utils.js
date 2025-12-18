import fs from 'fs';
export function readFileSafe(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf-8');
    }
    catch {
        return null;
    }
}
export function isIgnored(filePath, ignorePatterns) {
    return ignorePatterns.some(pattern => filePath.includes(pattern));
}
