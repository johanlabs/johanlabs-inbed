import { OpenRouterEmbedder } from './dist/embeddings/OpenRouter.js';
import { Inbed } from './dist/Inbed.js';

import 'dotenv/config';

async function demo() {
  try {
    // const embedder = new OllamaEmbedder('https://ollama.johan.chat', 'mxbai-embed-large');
    const embedder = new OpenRouterEmbedder(process.env.OPENAI_API_KEY, 'mistralai/codestral-embed-2505');

    const project = new Inbed(embedder, { rootDir: './' });
    await project.load();

    console.log('Loaded files:', project.listFiles().map(f => f.path));

    const results = await project.semanticSearch('demo');
    console.log('Semantic search results:');
    results.forEach(result => {
      console.log(result)
      console.log(`- ${result.path}: ${result.score.toFixed(4)}`);
    });

  } catch (error) {
    console.error('Demo failed:', error);
    process.exit(1);
  }
}

demo();