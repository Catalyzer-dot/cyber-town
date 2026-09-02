import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';

export const createPostgresCheckpointer = async (
  databaseUrl: string | undefined,
): Promise<PostgresSaver> => {
  databaseUrl = databaseUrl?.trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }
  const checkpointer = PostgresSaver.fromConnString(databaseUrl);
  try {
    await checkpointer.setup();
  } catch (error) {
    await checkpointer.end();
    throw error;
  }
  return checkpointer;
};
