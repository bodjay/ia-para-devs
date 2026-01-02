import { createAgent } from "langchain";
import { ChatOllama } from "@langchain/ollama";

import { ChatPromptTemplate } from "@langchain/core/prompts";

const prompt = ChatPromptTemplate.fromTemplate(`
  You are a attendant in a medical center.
  Classifies the user question and provide the needed information to 

  Question: {question}
  Answer: {answer}

  Score the answer from 1 to 10 based on accuracy, relevance, and completeness. 
  Provide a brief summary and reasoning.

  Respond in JSON:
  {{
    "action": "...",
    "score": number,
    "reasoning": "..."
  }}
`);

const provider = new ChatOllama({
  model: "llama3.2:1b", // llama3.2:1b, ministral-3:3b
  temperature: 0,
});

const chain = prompt.pipe(provider);

export default async function atentende(input: QuestionInput): Promise<ScoreOutput> {
    const response = await chain.invoke({
        question: input.question,
        answer: input.answer
    });

    const content =
        typeof response.content === "string"
            ? response.content
            : response.content.map((c: any) => c.text).join(" ");

    return JSON.parse(content);
}

interface QuestionInput {
  question: string;
  answer: string;
}

interface ScoreOutput {
  summary: string;
  score: number;
  reasoning: string;
}