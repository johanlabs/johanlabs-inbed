import OpenAI from 'openai';
export class OpenAIEmbedder {
    constructor(apiKey, model = 'text-embedding-3-small') {
        this.client = new OpenAI({ apiKey });
        this.model = model;
    }
    async embed(file) {
        const embeddings = [];
        for (const chunk of file.chunks) {
            try {
                const emb = await this.embedText(chunk);
                if (emb && emb.length > 0)
                    embeddings.push(emb);
                else
                    console.warn(`Skipping chunk due to failed embedding: ${chunk.substring(0, 50)}...`);
            }
            catch (error) {
                console.error('Error embedding chunk:', error);
            }
        }
        return embeddings;
    }
    async embedQuery(query) {
        try {
            return await this.embedText(query);
        }
        catch (error) {
            console.error('Error embedding query:', error);
            return [];
        }
    }
    async embedText(text) {
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
        }
        catch (error) {
            console.error('Error in embedText:', error.response?.data ?? error.message);
            return [];
        }
    }
}
