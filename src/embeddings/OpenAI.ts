import { InbedFile } from '../types.js';
import { Embedder } from './Embedder.js';
import OpenAI from 'openai';

export class OpenAIEmbedder implements Embedder {
  private client: OpenAI;
  model: string;

  constructor(apiKey: string, model: string = 'text-embedding-3-small') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async embed(file: InbedFile): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (const chunk of file.chunks) {
      try {
        const emb = await this.embedText(chunk);
        if (emb && emb.length > 0) embeddings.push(emb);
        else console.warn(`Skipping chunk due to failed embedding: ${chunk.substring(0, 50)}...`);
      } catch (error) {
        console.error('Error embedding chunk:', error);
      }
    }

    return embeddings;
  }

  async embedQuery(query: string): Promise<number[]> {
    try {
      return await this.embedText(query);
    } catch (error) {
      console.error('Error embedding query:', error);
      return [];
    }
  }

  private async embedText(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: text,
      });

      // A resposta retorna embeddings no campo data[0].embedding
      if (response.data && response.data.length > 0) {
        return response.data[0].embedding;
      }

      console.error('Resposta da API de Embedding inesperada:', response);
      return [];
    } catch (error: any) {
      console.error('Error in embedText:', error.response?.data ?? error.message);
      return [];
    }
  }
}
