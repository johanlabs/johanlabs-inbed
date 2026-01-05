import { Embedder } from "./embeddings/Embedder.js";

export interface InbedImport {
  source: string;
  resolved: string;
}

export interface InbedFile {
  path: string;
  content: string;
  chunks: string[];
  imports: InbedImport[];
  embedding?: number[][];
}

export interface SearchResult {
  path: string;
  snippet: string;
  score: number;
}

export interface InbedOptions {
  rootDir: string;
  recursive?: boolean;
  fileExtensions?: string[];
  ignorePatterns?: string[];
  maxDepth?: number;
}