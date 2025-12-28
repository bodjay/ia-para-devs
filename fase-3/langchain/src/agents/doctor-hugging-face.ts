import { pipeline } from '@huggingface/transformers';
import { env } from '@huggingface/transformers';

  env.allowRemoteModels = true; 
// env.backends.onnx.wasm.numThreads = 1;

// Use the pipeline function to load a pre-trained model for a specific task
const pipe = pipeline(
  'text-generation',
  'openai-community/gpt2'
);

export default {
  invoke: async (input: { messages: { role: string; content: string }[] }) => {
    const userMessage = input.messages.find(msg => msg.role === 'user')?.content || '';
    const output = await (await pipe)(userMessage, { max_length: 100 });
    return {
      messages: [
        ...input.messages,
        { role: 'agent', content: output[0] }
      ]
    };
  }
}
// Later, you can use the transcriber instance
// (This is a simplified example; actual usage involves async operations and data handling)
