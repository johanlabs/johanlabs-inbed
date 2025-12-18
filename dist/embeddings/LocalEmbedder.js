export class LocalEmbedder {
    async embed(file) {
        return file.chunks.map(chunk => this.stringToVector(chunk));
    }
    async embedQuery(query) {
        return this.stringToVector(query);
    }
    stringToVector(text) {
        const vec = [];
        for (let i = 0; i < text.length; i++) {
            vec.push(text.charCodeAt(i) / 255);
        }
        return vec;
    }
}
