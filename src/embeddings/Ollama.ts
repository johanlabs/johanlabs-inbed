import axios from 'axios';
import { InbedFile } from '../types.js';
import { Embedder } from './Embedder.js';

/**
 * Interface InbedFile
 * export interface InbedFile {
 *   name: string;
 *   chunks: string[];
 * }
 */

/**
 * Interface Embedder
 * export interface Embedder {
 *   embed(file: InbedFile): Promise<number[][]>;
 *   embedQuery(query: string): Promise<number[]>;
 * }
 */

export class OllamaEmbedder implements Embedder {
  private baseUrl: string;
  model: string;

  constructor(baseUrl: string = 'http://localhost:11434', model: string = 'mxbai-embed-large') {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async embed(file: InbedFile): Promise<number[][]> {
    const embeddings: number[][] = [];
    for (const chunk of file.chunks) {
      const emb = await this.embedText(chunk);
      if (emb && emb.length > 0) embeddings.push(emb);
      else console.warn(`Skipping chunk due to failed embedding: ${chunk.substring(0, 50)}...`);
    }
    return embeddings;
  }

  async embedQuery(query: string): Promise<number[]> {
    return this.embedText(query);
  }

  private async embedText(text: string): Promise<number[]> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/embed`,
        {
          model: this.model,
          input: text
        },
        { timeout: 30000 }
      );

      if (response.data?.embeddings && response.data.embeddings.length > 0) {
        return response.data.embeddings[0];
      }
      
      console.error('Resposta da API Ollama inesperada:', response.data);
      return [];
    } catch (error: any) {
      console.error(
        'Erro em embedText (Ollama):',
        error.response?.data ? JSON.stringify(error.response.data) : error.message
      );
      return [];
    }
  }
}
