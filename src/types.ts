import { Embedder } from "./embeddings/Embedder.js";

export interface InbedFile {
  path: string;
  content: string;
  chunks: string[];
  imports: string[];
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