import { aiProvider } from './src/integrations/aiProvider.js';
import { z } from 'zod';

async function test() {
  try {
    const res = await aiProvider.generateStructuredOutput({
      systemPrompt: 'You are an AI assistant. Output JSON with { "message": "hello" }',
      userPrompt: 'Hello, respond with a greeting.',
      schema: z.object({ message: z.string() }),
      model: 'meta/llama-3.2-90b-vision-instruct',
      allowFallback: false,
      mockMode: false,
    });
    console.log('Structured output test:', JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('Structured output error:', err);
  }
}

test();
