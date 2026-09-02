import { PostgresStore } from '@langchain/langgraph-checkpoint-postgres/store';

export const createPostgresStore = async (databaseUrl?: string): Promise<PostgresStore> => {
  const url = databaseUrl?.trim();
  if (!url) {
    throw new Error('DATABASE_URL is required');
  }
  const store = PostgresStore.fromConnString(url);
  try {
    await store.setup();
  } catch (error) {
    await store.stop();
    throw error;
  }

  return store;
};
