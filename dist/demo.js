import { OllamaEmbedder } from './embeddings/Ollama.js';
import { Inbed } from './Inbed.js';
async function demo() {
    try {
        const embedder = new OllamaEmbedder('https://ollama.johan.chat', 'mxbai-embed-large');
        const project = new Inbed(embedder, { rootDir: './' });
        await project.load();
        console.log('Loaded files:', project.listFiles().map(f => f.path));
        const results = await project.semanticSearch('package');
        console.log('Semantic search results:');
        results.forEach(result => {
            console.log(`- ${result.path}: ${result.score.toFixed(4)}`);
        });
        // Clean up
        project.clear();
    }
    catch (error) {
        console.error('Demo failed:', error);
        process.exit(1);
    }
}
demo();
