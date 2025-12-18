import axios from 'axios';
/**
 * Interface InbedFile (exemplo)
 * export interface InbedFile {
 * name: string;
 * chunks: string[];
 * }
 */
/**
 * Interface Embedder (exemplo)
 * export interface Embedder {
 * embed(file: InbedFile): Promise<number[][]>;
 * embedQuery(query: string): Promise<number[]>;
 * }
 */
export class OpenRouterEmbedder {
    constructor(apiKey, model) {
        this.apiKey = apiKey;
        this.model = model;
    }
    async embed(file) {
        try {
            const embeddings = [];
            // Itera sobre todos os 'chunks' (pedaços) do arquivo
            for (const chunk of file.chunks) {
                // Gera o embedding para cada pedaço
                const emb = await this.embedText(chunk);
                // Adiciona o embedding resultante ao array de embeddings
                if (emb && emb.length > 0) {
                    embeddings.push(emb);
                }
                else {
                    // Trata o caso em que embedText retorna um array vazio (erro)
                    console.warn(`Skipping chunk due to failed embedding: ${chunk.substring(0, 50)}...`);
                }
            }
            return embeddings;
        }
        catch (error) {
            console.error('Error embedding file:', error);
            return [];
        }
    }
    async embedQuery(query) {
        try {
            // Usa o mesmo método para embutir a query
            return await this.embedText(query);
        }
        catch (error) {
            console.error('Error embedding query:', error);
            return [];
        }
    }
    async embedText(text) {
        try {
            const response = await axios.post('https://openrouter.ai/api/v1/embeddings', {
                input: text,
                model: this.model
            }, {
                headers: {
                    // Utiliza a chave da instância
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                timeout: 30000
            });
            // A resposta da OpenRouter/OpenAI retorna um array em 'data', 
            // e o primeiro objeto contém o 'embedding'
            // Exemplo de estrutura de resposta: { "data": [{ "embedding": [0.1, 0.2, ...], ... }], ... }
            if (response.data && response.data.data && response.data.data.length > 0) {
                return response.data.data[0].embedding;
            }
            // Se a resposta for inesperada, loga e retorna array vazio
            console.error('Resposta da API de Embedding inesperada:', response.data);
            return [];
        }
        catch (error) {
            // Loga detalhes do erro (como o corpo da resposta da API, se disponível)
            console.error('Error in embedText:', error.response?.data ? JSON.stringify(error.response.data) : error.message);
            // Retorna um array vazio para que a chamada externa possa continuar
            return [];
        }
    }
}
