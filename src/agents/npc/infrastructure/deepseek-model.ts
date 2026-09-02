import { ChatDeepSeek } from '@langchain/deepseek';

export type DeepSeekModelOptions = {
  apiKey: string;
  model: string;
};

export const createDeepSeekModel = (options: DeepSeekModelOptions): ChatDeepSeek => {
  return new ChatDeepSeek({
    apiKey: options.apiKey,
    model: options.model,
    temperature: 0.7,
    maxTokens: 200,
    maxRetries: 0,
    modelKwargs: {
      thinking: {
        type: 'disabled',
      },
    },
  });
};
