import { InbedFile } from '../types.js';

export interface Embedder {
  model: string;
  embed(file: InbedFile): Promise<number[][]>;
  embedQuery(query: string): Promise<number[]>;
}