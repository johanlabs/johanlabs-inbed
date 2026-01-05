import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import chokidar from 'chokidar';

import { glob } from 'glob';
import ts from 'typescript';
import { InbedFile, InbedOptions, SearchResult, InbedImport } from './types.js';

import { Embedder } from './embeddings/Embedder.js';

export class Inbed {
  private files: Map<string, InbedFile> = new Map();
  private options: InbedOptions;
  private embedder: Embedder;
  private watcher: any;
  private storageDir: string;
  private chunkLimit: number;

  private embeddingQueue: Promise<void>[] = [];
  private maxConcurrentEmbeds = 4;

  private debounceMap: Map<string, NodeJS.Timeout> = new Map();

  constructor(embedder: Embedder, options: InbedOptions) {
    this.options = {
      recursive: true,
      fileExtensions: ['.ts', '.js'],
      ignorePatterns: ['johankit.yaml', 'dist/**', 'node_modules/**', '.git/**', '.inbed/**', ...(options.ignorePatterns || [])],
      maxDepth: 10,
      ...options
    };
    this.embedder = embedder;
    this.chunkLimit = (options as any).chunkLimit || 10;
    this.storageDir = path.join(this.options.rootDir, '.inbed');
    if (!fs.existsSync(this.storageDir)) fs.mkdirSync(this.storageDir, { recursive: true });
  }

  async load(): Promise<void> {
    const patterns = this.options.fileExtensions!.map(ext => `**/*${ext}`);
    const files = patterns.flatMap(pattern => glob.sync(pattern, { cwd: this.options.rootDir, ignore: this.options.ignorePatterns, nodir: true }));

    for (const filePath of files) {
      const fullPath = path.join(this.options.rootDir, filePath);
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        await this.enqueueAdd(path.normalize(filePath), content);
      } catch {}
    }

    await this.flushQueue();

    if (this.options.recursive) {
      for (const file of Array.from(this.files.values())) {
        this.resolveImports(file, 0);
      }
    }

    this.watchFiles();
  }

  private hashContent(content: string): string {
    const version = 'chunker:v2';
    return crypto.createHash('sha256').update(version + content + this.chunkLimit + this.embedder.model, 'utf-8').digest('hex');
  }

  private normalize(vec: number[]): number[] {
    let norm = 0;
    for (const v of vec) norm += v * v;
    norm = Math.sqrt(norm);
    if (norm === 0) return vec;
    return vec.map(v => v / norm);
  }

  private async enqueueAdd(filePath: string, content: string) {
    const task = async () => {
      await this.addFile(filePath, content);
    };

    while (this.embeddingQueue.length >= this.maxConcurrentEmbeds) {
      await Promise.race(this.embeddingQueue);
    }

    const p = task().finally(() => {
      this.embeddingQueue = this.embeddingQueue.filter(x => x !== p);
    });

    this.embeddingQueue.push(p);
  }

  private async flushQueue() {
    await Promise.allSettled(this.embeddingQueue);
  }

  private async addFile(filePath: string, content: string) {
    const storagePath = path.join(this.storageDir, `${filePath.replace(/\\/g, '_')}_${this.embedder.model}.json`);
    let embedding: number[][] | undefined;
    const currentHash = this.hashContent(content);

    if (fs.existsSync(storagePath)) {
      try {
        const saved = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
        if (saved.hash === currentHash) embedding = saved.embedding;
      } catch {}
    }

    let chunks = this.isSmall(content) ? [content] : this.chunkByAST(content);
    if (chunks.length > this.chunkLimit) chunks = chunks.slice(0, this.chunkLimit);

    if (!embedding) {
      const raw = await this.embedder.embed({ path: filePath, content, chunks, imports: [] });
      embedding = raw.map(v => this.normalize(v));
      try {
        fs.writeFileSync(storagePath, JSON.stringify({ hash: currentHash, embedding }, null, 2));
      } catch {}
    }

    this.files.set(filePath, { path: filePath, content, chunks, imports: [], embedding });
  }

  private isSmall(content: string): boolean {
    return content.split('\n').length < 50;
  }

  private chunkByAST(content: string): string[] {
    try {
      const sourceFile = ts.createSourceFile('temp.ts', content, ts.ScriptTarget.Latest);
      const chunks: string[] = [];
      let buffer = '';
      ts.forEachChild(sourceFile, node => {
        const text = node.getFullText(sourceFile).trim();
        if (!text) return;
        if ((buffer + text).length > 800) {
          chunks.push(buffer);
          buffer = text;
        } else {
          buffer += '\n' + text;
        }
      });
      if (buffer.trim()) chunks.push(buffer.trim());
      return chunks.length ? chunks : [content];
    } catch {
      return [content];
    }
  }

  private resolveImports(file: InbedFile, depth: number) {
    if (depth > (this.options.maxDepth || 10)) return;

    const imports: InbedImport[] = [];

    const importRegex = /import\s+(?:[^'"\n]+)\s+from\s+['"](.+)['"]|require\(\s*['"](.+)['"]\s*\)/g;

    let match;
    while ((match = importRegex.exec(file.content)) !== null) {
      const sourceImport = match[1] || match[2];
      if (!sourceImport) continue;

      const base = path.join(path.dirname(file.path), sourceImport);

      for (const ext of ['', '.ts', '.tsx', '.js', '/index.ts', '/index.js']) {
        const candidate = path.normalize(base + ext);
        if (this.files.has(candidate)) {
          imports.push({ source: sourceImport, resolved: candidate });
          this.resolveImports(this.files.get(candidate)!, depth + 1);
          break;
        }
      }
    }

    file.imports = imports.filter((v, i, arr) => arr.findIndex(x => x.resolved === v.resolved) === i);
  }

  async upsertFile(filePath: string, content: string) {
    await this.enqueueAdd(path.normalize(filePath), content);
  }

  getFile(filePath: string): InbedFile | undefined {
    return this.files.get(path.normalize(filePath));
  }

  listFiles(): InbedFile[] {
    return Array.from(this.files.values());
  }

  async semanticSearch(query: string, topK: number = 5): Promise<SearchResult[]> {
    const queryEmbedding = this.normalize(await this.embedder.embedQuery(query));
    const results: SearchResult[] = [];

    for (const file of this.files.values()) {
      if (!file.embedding) continue;
      let bestScore = 0;
      let bestChunk = '';
      for (let i = 0; i < file.embedding.length; i++) {
        const score = this.cosineSimilarity(queryEmbedding, file.embedding[i]);
        if (score > bestScore) {
          bestScore = score;
          bestChunk = file.chunks[i] || '';
        }
      }
      if (bestScore > 0) {
        const importsText = file.imports.map(imp => `${imp.source} -> ${imp.resolved}`).join('\n');
        const context = `FILE: ${file.path}\nIMPORTS:\n${importsText || '(none)'}\n---\n${bestChunk}`;
        results.push({ path: file.path, snippet: context.slice(0, 500), score: bestScore });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) dot += a[i] * b[i];
    return dot;
  }

  private watchFiles() {
    this.watcher = chokidar.watch(this.options.rootDir, {
      ignored: this.options.ignorePatterns,
      persistent: true,
      ignoreInitial: true
    });

    const schedule = (fullPath: string, handler: () => void) => {
      if (this.debounceMap.has(fullPath)) clearTimeout(this.debounceMap.get(fullPath)!);
      this.debounceMap.set(fullPath, setTimeout(handler, 200));
    };

    this.watcher
      .on('add', fullPath => schedule(fullPath, async () => {
        const relPath = path.relative(this.options.rootDir, fullPath);
        if (this.options.fileExtensions?.some(ext => fullPath.endsWith(ext))) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            await this.enqueueAdd(relPath, content);
            if (this.options.recursive) this.resolveImports(this.files.get(relPath)!, 0);
          } catch {}
        }
      }))
      .on('change', fullPath => schedule(fullPath, async () => {
        const relPath = path.relative(this.options.rootDir, fullPath);
        if (this.options.fileExtensions?.some(ext => fullPath.endsWith(ext))) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            await this.enqueueAdd(relPath, content);
            if (this.options.recursive) this.resolveImports(this.files.get(relPath)!, 0);
          } catch {}
        }
      }))
      .on('unlink', fullPath => {
        const relPath = path.relative(this.options.rootDir, fullPath);
        this.files.delete(relPath);
      });
  }

  stopWatching() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  clear(): void {
    this.stopWatching();
    this.files.clear();
  }
}
