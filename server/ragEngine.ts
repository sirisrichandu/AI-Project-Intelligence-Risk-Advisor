export interface DocumentChunk {
  id: string;
  documentId: string;
  documentName: string;
  category: 'requirements' | 'architecture' | 'meetings' | 'tasks' | 'general';
  text: string;
  page?: number;
  metadata?: Record<string, any>;
}

export interface SearchResult {
  chunk: DocumentChunk;
  score: number;
}

export class RAGPipeline {
  private chunks: DocumentChunk[] = [];

  constructor() {}

  public addChunks(newChunks: DocumentChunk[]): void {
    this.chunks.push(...newChunks);
  }

  public removeDocumentChunks(documentId: string): void {
    this.chunks = this.chunks.filter((c) => c.documentId !== documentId);
  }

  public getAllChunks(): DocumentChunk[] {
    return this.chunks;
  }

  public chunkText(
    text: string,
    documentId: string,
    documentName: string,
    category: DocumentChunk['category'],
    chunkSize: number = 700,
    chunkOverlap: number = 120
  ): DocumentChunk[] {
    const cleanedText = text.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
    const createdChunks: DocumentChunk[] = [];
    let start = 0;
    let chunkIndex = 1;

    while (start < cleanedText.length) {
      const end = Math.min(start + chunkSize, cleanedText.length);
      const slice = cleanedText.slice(start, end).trim();
      if (slice.length > 30) {
        createdChunks.push({
          id: `${documentId}-chunk-${chunkIndex}`,
          documentId,
          documentName,
          category,
          text: slice,
          page: Math.floor(start / 1500) + 1,
        });
        chunkIndex++;
      }
      start += chunkSize - chunkOverlap;
    }

    if (createdChunks.length === 0 && cleanedText.length > 0) {
      createdChunks.push({
        id: `${documentId}-chunk-1`,
        documentId,
        documentName,
        category,
        text: cleanedText,
        page: 1,
      });
    }

    return createdChunks;
  }

  public search(query: string, topK: number = 5, categoryFilter?: string): SearchResult[] {
    if (!this.chunks.length) return [];

    const queryTerms = query
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((t) => t.length > 2);

    const scored = this.chunks
      .filter((chunk) => !categoryFilter || chunk.category === categoryFilter)
      .map((chunk) => {
        const textLower = chunk.text.toLowerCase();
        let matchCount = 0;
        for (const term of queryTerms) {
          const regex = new RegExp(`\\b${term}\\b`, 'gi');
          const matches = (textLower.match(regex) || []).length;
          matchCount += matches * 2;
          if (textLower.includes(term)) {
            matchCount += 1;
          }
        }

        // Slight bonus if chunk contains important milestone/risk/deadline indicators
        if (/risk|delay|blocker|critical|deadline|milestone|objective/i.test(chunk.text)) {
          matchCount += 0.5;
        }

        return {
          chunk,
          score: matchCount,
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    // If query terms produced matches, return topK
    if (scored.length > 0) {
      return scored.slice(0, topK);
    }

    // Fallback: return top representative chunks across available documents
    return this.chunks.slice(0, topK).map((chunk) => ({ chunk, score: 0.1 }));
  }

  public buildContext(searchResults: SearchResult[]): { contextText: string; sources: string[] } {
    const sourcesSet = new Set<string>();
    const contextLines = searchResults.map((res, i) => {
      sourcesSet.add(res.chunk.documentName);
      return `[Source: ${res.chunk.documentName}, Part ${res.chunk.id}]\n${res.chunk.text}\n`;
    });

    return {
      contextText: contextLines.join('\n---\n'),
      sources: Array.from(sourcesSet),
    };
  }
}
