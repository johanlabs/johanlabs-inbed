# Inbed

**Inbed** is a TypeScript library for **semantic indexing and search over source code** using vector embeddings.  
It analyzes files, splits them into intelligent chunks (AST-based), generates embeddings, resolves imports recursively, and keeps everything in sync with the filesystem.

It is designed for **code search**, **RAG pipelines**, and **LLM-assisted developer tools**.

---

## ✨ Features

- 📂 Automatic indexing of source files (`.ts`, `.js`, etc.)
- 🧠 Semantic search using cosine similarity
- 🧩 AST-based chunking for TypeScript
- 🔁 Recursive import resolution
- ⚡ Local embedding cache (avoids recomputation)
- 👀 File watcher with debounce (hot updates)
- 🔌 Multiple embedding providers:
  - OpenAI
  - Ollama (local)
  - OpenRouter

---

## 📦 Installation

```bash
npm install inbed
````

or

```bash
pnpm add inbed
```

---

## 🚀 Basic Usage

### 1. Create an Embedder

#### OpenAI

```ts
import { OpenAIEmbedder } from 'inbed';

const embedder = new OpenAIEmbedder(process.env.OPENAI_API_KEY!);
```

#### Ollama (local)

```ts
import { OllamaEmbedder } from 'inbed';

const embedder = new OllamaEmbedder(
  'http://localhost:11434',
  'mxbai-embed-large'
);
```

#### OpenRouter

```ts
import { OpenRouterEmbedder } from 'inbed';

const embedder = new OpenRouterEmbedder(
  process.env.OPENROUTER_API_KEY!,
  'text-embedding-3-small'
);
```

---

### 2. Initialize Inbed

```ts
import { Inbed } from 'inbed';

const inbed = new Inbed(embedder, {
  rootDir: process.cwd(),
  recursive: true,
  fileExtensions: ['.ts', '.js'],
  ignorePatterns: ['dist/**', 'node_modules/**'],
  maxDepth: 10
});

await inbed.load();
```

---

## 🔍 Semantic Search

```ts
const results = await inbed.semanticSearch(
  'function that resolves imports',
  5
);

for (const r of results) {
  console.log(r.path, r.score);
  console.log(r.snippet);
}
```

Each result includes:

* `path`: file path
* `snippet`: most relevant chunk
* `score`: cosine similarity score

---

## 🧠 How It Works

1. **File discovery**
2. **Chunking**

   * Small files → single chunk
   * Large files → AST-based chunks
3. **Embedding**

   * One embedding per chunk
   * L2 normalization
4. **Caching**

   * Stored under `.inbed/`
   * Reused if content hash matches
5. **Search**

   * Query embedding vs chunk embeddings
   * Best chunk per file is selected

---

## 👀 File Watching

Inbed automatically watches the project directory:

* `add` → index file
* `change` → reindex file
* `unlink` → remove file

Stop watching:

```ts
inbed.stopWatching();
```

---

## ⚙️ Options (`InbedOptions`)

```ts
interface InbedOptions {
  rootDir: string;
  recursive?: boolean;
  fileExtensions?: string[];
  ignorePatterns?: string[];
  maxDepth?: number;
}
```

---

## 🧩 Core Interfaces

### `Embedder`

```ts
interface Embedder {
  model: string;
  embed(file: InbedFile): Promise<number[][]>;
  embedQuery(query: string): Promise<number[]>;
}
```

### `InbedFile`

```ts
interface InbedFile {
  path: string;
  content: string;
  chunks: string[];
  imports: string[];
  embedding?: number[][];
}
```

---

## 📌 Use Cases

* 🔎 Semantic code search
* 🤖 LLM context retrieval (RAG)
* 🧠 Developer tooling
* 📚 Navigating large or legacy codebases

---

## 📄 License

MIT

````

---

# 🧪 Example CLI

A CLI is a **perfect fit** for Inbed.  
Here’s a **minimal but production-ready example**.

---

## 📁 Structure

```txt
cli/
 ├─ index.ts
 └─ package.json
````

---

## `cli/index.ts`

```ts
#!/usr/bin/env node

import { Inbed, OllamaEmbedder, OpenAIEmbedder } from 'inbed';
import readline from 'readline';
import path from 'path';

const rootDir = process.argv[2]
  ? path.resolve(process.argv[2])
  : process.cwd();

// Choose embedder
const embedder =
  process.env.OPENAI_API_KEY
    ? new OpenAIEmbedder(process.env.OPENAI_API_KEY)
    : new OllamaEmbedder();

console.log('🔍 Inbed CLI');
console.log('Indexing:', rootDir);

const inbed = new Inbed(embedder, {
  rootDir,
  recursive: true,
  fileExtensions: ['.ts', '.js'],
  ignorePatterns: ['node_modules/**', 'dist/**']
});

await inbed.load();

console.log('✅ Index ready');
console.log('Type your query and press Enter\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', async (query) => {
  if (!query.trim()) return;

  const results = await inbed.semanticSearch(query, 5);

  console.log('\n--- RESULTS ---\n');

  for (const r of results) {
    console.log(`📄 ${r.path}`);
    console.log(`⭐ Score: ${r.score.toFixed(3)}`);
    console.log(r.snippet);
    console.log('---------------------------\n');
  }
});
```

---

## `cli/package.json`

```json
{
  "name": "inbed-cli",
  "type": "module",
  "bin": {
    "inbed": "./index.js"
  },
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

---

## ▶️ Running the CLI

```bash
inbed .
```

Then type queries like:

```txt
function that watches files
AST chunking logic
where embeddings are cached
```
