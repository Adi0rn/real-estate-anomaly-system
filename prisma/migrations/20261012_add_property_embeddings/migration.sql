-- Enable pgvector (Supabase commonly installs it in extensions)
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Store 384-dimensional property embeddings
CREATE TABLE "PropertyEmbedding" (
    "embeddingId" SERIAL PRIMARY KEY,
    "propertyId" INTEGER NOT NULL UNIQUE
        REFERENCES "Property"("propertyId") ON DELETE CASCADE,
    embedding extensions.vector(384),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient cosine similarity search
CREATE INDEX property_embedding_hnsw_idx
ON "PropertyEmbedding"
USING hnsw (embedding extensions.vector_cosine_ops);