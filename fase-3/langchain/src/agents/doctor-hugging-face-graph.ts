/**
 * Multi-Source Knowledge Router Example
 *
 * This example demonstrates the router pattern for multi-agent systems.
 * A router classifies queries, routes them to specialized agents in parallel,
 * and synthesizes results into a combined response.
 */

import { tool, createAgent, ReactAgent } from "langchain";
import { StateGraph, Annotation, START, END, Send } from "@langchain/langgraph";
import { z } from "zod";
import { ChatOllama, Ollama } from "@langchain/ollama";
import { ChatOpenAI } from "@langchain/openai";


// Type definitions
interface AgentInput {
  query: string;
}

interface AgentOutput {
  source: string;
  result: string;
}

interface Classification {
  source: "github" | "notion" | "slack";
  query: string;
}

// State definition with reducer for collecting parallel results
const RouterState = Annotation.Root({
  query: Annotation<string>(),
  classifications: Annotation<Classification[]>(),
  results: Annotation<AgentOutput[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),
  finalAnswer: Annotation<string>(),
});

// Structured output schema for classifier
const ClassificationResultSchema = z.object({
  classifications: z.array(z.object({
    source: z.enum(["github", "notion", "slack"]),
    query: z.string(),
  })).describe("List of agents to invoke with their targeted sub-questions"),
});


// Tools
const searchCode = tool(
  async ({ query, repo }) => {
    return `Found code matching '${query}' in ${repo || "main"}: authentication middleware in src/auth.py`;
  },
  {
    name: "search_code",
    description: "Search code in GitHub repositories.",
    schema: z.object({
      query: z.string(),
      repo: z.string().optional().default("main"),
    }),
  }
);

const searchIssues = tool(
  async ({ query }) => {
    return `Found 3 issues matching '${query}': #142 (API auth docs), #89 (OAuth flow), #203 (token refresh)`;
  },
  {
    name: "search_issues",
    description: "Search GitHub issues and pull requests.",
    schema: z.object({
      query: z.string(),
    }),
  }
);

const searchPrs = tool(
  async ({ query }) => {
    return `PR #156 added JWT authentication, PR #178 updated OAuth scopes`;
  },
  {
    name: "search_prs",
    description: "Search pull requests for implementation details.",
    schema: z.object({
      query: z.string(),
    }),
  }
);

const searchNotion = tool(
  async ({ query }) => {
    return `Found documentation: 'API Authentication Guide' - covers OAuth2 flow, API keys, and JWT tokens`;
  },
  {
    name: "search_notion",
    description: "Search Notion workspace for documentation.",
    schema: z.object({
      query: z.string(),
    }),
  }
);

const getPage = tool(
  async ({ pageId }) => {
    return `Page content: Step-by-step authentication setup instructions`;
  },
  {
    name: "get_page",
    description: "Get a specific Notion page by ID.",
    schema: z.object({
      pageId: z.string(),
    }),
  }
);

const searchSlack = tool(
  async ({ query }) => {
    return `Found discussion in #engineering: 'Use Bearer tokens for API auth, see docs for refresh flow'`;
  },
  {
    name: "search_slack",
    description: "Search Slack messages and threads.",
    schema: z.object({
      query: z.string(),
    }),
  }
);

const getThread = tool(
  async ({ threadId }) => {
    return `Thread discusses best practices for API key rotation`;
  },
  {
    name: "get_thread",
    description: "Get a specific Slack thread.",
    schema: z.object({
      threadId: z.string(),
    }),
  }
);

// Models and agentsf
// const llm = new ChatOpenAI({ model: "gpt-4o", apiKey: process.env.OPENAI_API_KEY });
const llm = new ChatOllama({
  model: "smollm2:1.7b",
});


const routerLlm = createAgent({
  model: "ollama:smollm2:1.7b",
  responseFormat: ClassificationResultSchema
});

const githubAgent = createAgent({
  model: "ollama:smollm2:1.7b",
  tools: [searchCode, searchIssues, searchPrs],
  systemPrompt: `
You are a GitHub expert. Answer questions about code,
API references, and implementation details by searching
repositories, issues, and pull requests.
  `.trim(),
});

const notionAgent = createAgent({
  model: "ollama:smollm2:1.7b",
  tools: [searchNotion, getPage],
  systemPrompt: `
You are a Notion expert. Answer questions about internal
processes, policies, and team documentation by searching
the organization's Notion workspace.
  `.trim(),
});

const slackAgent = createAgent({
  model: "ollama:smollm2:1.7b",
  tools: [searchSlack, getThread],
  systemPrompt: `
You are a Slack expert. Answer questions by searching
relevant threads and discussions where team members have
shared knowledge and solutions.
  `.trim(),
});


// Workflow nodes
async function classifyQuery(state: typeof RouterState.State) {

  const result = await routerLlm.invoke({
    messages: [
      {
        role: "system",
        content: `Analyze this query and determine which knowledge bases to consult.
For each relevant source, generate a targeted sub-question optimized for that source.

Available sources:
- github: Code, API references, implementation details, issues, pull requests
- notion: Internal documentation, processes, policies, team wikis
- slack: Team discussions, informal knowledge sharing, recent conversations

Return ONLY the sources that are relevant to the query.`
      },
      { role: "user", content: state.query }
    ]
  });

  console.log({result: result})

  return { classifications: result.messages };
}

function routeToAgents(state: typeof RouterState.State): Send[] {
  return state.classifications?.map(
    (c) => new Send(c.source, { query: c.query })
  );
}

async function queryGithub(state: AgentInput) {
  const result = await githubAgent.invoke({
    messages: [{ role: "user", content: state.query }]
  });
  return { results: [{ source: "github", result: result.messages.at(-1)?.content }] };
}

async function queryNotion(state: AgentInput) {
  const result = await notionAgent.invoke({
    messages: [{ role: "user", content: state.query }]
  });
  return { results: [{ source: "notion", result: result.messages.at(-1)?.content }] };
}

async function querySlack(state: AgentInput) {
  const result = await slackAgent.invoke({
    messages: [{ role: "user", content: state.query }]
  });
  return { results: [{ source: "slack", result: result.messages.at(-1)?.content }] };
}

async function synthesizeResults(state: typeof RouterState.State) {
  if (state.results.length === 0) {
    return { finalAnswer: "No results found from any knowledge source." };
  }

  const formatted = state.results.map(
    (r) => `**From ${r.source.charAt(0).toUpperCase() + r.source.slice(1)}:**\n${r.result}`
  );

  const synthesisResponse = await routerLlm.invoke({
    messages: [
      {
        role: "system",
        content: `Synthesize these search results to answer the original question: "${state.query}"

- Combine information from multiple sources without redundancy
- Highlight the most relevant and actionable information
- Note any discrepancies between sources
- Keep the response concise and well-organized`
      },
      { role: "user", content: formatted.join("\n\n") }
    ]
  });

  return { finalAnswer: synthesisResponse.messages };
}


// Build workflow
const workflow = new StateGraph(RouterState)
  .addNode("classify", classifyQuery)
  .addNode("github", queryGithub)
  .addNode("notion", queryNotion)
  .addNode("slack", querySlack)
  .addNode("synthesize", synthesizeResults)
  .addEdge(START, "classify")
  .addConditionalEdges("classify", routeToAgents, ["github", "notion", "slack"])
  .addEdge("github", "synthesize")
  .addEdge("notion", "synthesize")
  .addEdge("slack", "synthesize")
  .addEdge("synthesize", END)
  .compile();

// const result = await workflow.invoke({
//   query: "How do I authenticate API requests?"
// });

// console.log("Original query:", result.query);
// console.log("\nClassifications:");
// for (const c of result.classifications) {
//   console.log(`  ${c.source}: ${c.query}`);
// }
// console.log("\n" + "=".repeat(60) + "\n");
// console.log("Final Answer:");
// console.log(result.finalAnswer);

export default workflow;