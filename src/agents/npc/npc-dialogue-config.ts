import type { RetryPolicy } from '@langchain/langgraph';

export const MAX_HISTORY_MESSAGES = 10;

export const GENERATE_REPLY_RETRY_POLICY = {
  initialInterval: 200,
  backoffFactor: 2,
  maxInterval: 2_000,
  maxAttempts: 3,
  jitter: true,
} satisfies RetryPolicy;
