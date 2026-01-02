/**
 * Multi-Source Knowledge Router for Medical Assistant System
 * 
 * This system routes medical queries to specialized agents:
 * - Appointments agent: Handles appointment management (search/create)
 * - Medical QA agent: Answers health-related questions
 * 
 * Features:
 * 1. Query classification to identify relevant knowledge sources
 * 2. Parallel execution of specialized agents
 * 3. Result synthesis for unified response
 */

import { tool, createAgent } from "langchain";
import { ChatOllama } from "@langchain/ollama";
import { StateGraph, Annotation, START, END, Send } from "@langchain/langgraph";
import { z } from "zod";
import { randomUUID } from "crypto";

// ==================== TYPE DEFINITIONS ====================

/**
 * Input to the workflow - user's original query
 */
interface WorkflowInput {
  query: string;
}

/**
 * Output from individual agents
 */
interface AgentResponse {
  source: KnowledgeSource;
  result: string;
  timestamp: Date;
}

/**
 * Classification result for routing queries
 */
interface QueryClassification {
  source: KnowledgeSource;
  optimizedQuery: string;
  confidence: number;
}

/**
 * Available knowledge sources in the system
 */
type KnowledgeSource = "appointments" | "medical-qa";

/**
 * Appointment-related data structure
 */
interface AppointmentData {
  id: string;
  patientName: string;
  patientBirthday: string;
  appointmentDate: string;
  doctor?: string;
  reason?: string;
}

/**
 * Medical question data structure
 */
interface MedicalQuestion {
  symptoms: string[];
  patientContext?: {
    age?: number;
    existingConditions?: string[];
  };
  urgency: "low" | "medium" | "high";
}

// ==================== ZOD SCHEMAS ====================

/**
 * Schema for classification result from LLM
 */
const ClassificationResultSchema = z.object({
  classifications: z.array(z.object({
    source: z.enum(["appointments", "medical-qa"]),
    optimizedQuery: z.string(),
    confidence: z.number().min(0).max(1)
      .describe("Confidence score for this classification (0-1)")
  })).describe("List of relevant agents with optimized sub-queries")
});

/**
 * Schema for appointment search tool
 */
const AppointmentSearchSchema = z.object({
  patientName: z.string().describe("Full name of the patient"),
  patientBirthday: z.string().describe("Birthday in MM/DD/YYYY format")
});

/**
 * Schema for appointment creation tool
 */
const AppointmentCreationSchema = z.object({
  patientName: z.string(),
  patientBirthday: z.string(),
  preferredDate: z.string().optional(),
  reason: z.string().optional()
});

/**
 * Schema for state management in the workflow
 */
const WorkflowState = Annotation.Root({
  // Original user query
  originalQuery: Annotation<string>(),
  
  // Query analysis results
  classifications: Annotation<QueryClassification[]>(),
  
  // Agent execution results
  agentResponses: Annotation<AgentResponse[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),
  
  // Final synthesized answer
  finalAnswer: Annotation<string>(),
  
});

// ==================== TOOL DEFINITIONS ====================

/**
 * Tool to search for existing appointments
 */
const searchAppointmentTool = tool(
  async (params: z.infer<typeof AppointmentSearchSchema>) => {
    const { patientName, patientBirthday } = params;
    
    // Simulate database lookup
    const mockAppointment: AppointmentData = {
      id: randomUUID(),
      patientName,
      patientBirthday,
      appointmentDate: new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      doctor: "Dr. Smith",
      reason: "Annual Checkup"
    };

    return {
      status: "found",
      appointment: mockAppointment,
      message: `Found appointment for ${patientName}: ${mockAppointment.appointmentDate} with ${mockAppointment.doctor}`
    };
  },
  {
    name: "search_appointments",
    description: "Search for existing appointments by patient name and birthday",
    schema: AppointmentSearchSchema,
  }
);

/**
 * Tool to create new appointments
 */
const createAppointmentTool = tool(
  async (params: z.infer<typeof AppointmentCreationSchema>) => {
    const { patientName, patientBirthday, preferredDate, reason } = params;
    
    // Simulate appointment creation
    const newAppointment: AppointmentData = {
      id: randomUUID(),
      patientName,
      patientBirthday,
      appointmentDate: preferredDate || 
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      doctor: "Dr. Johnson",
      reason: reason || "General Consultation"
    };

    return {
      status: "created",
      appointment: newAppointment,
      confirmation: `Appointment created for ${patientName} on ${newAppointment.appointmentDate}`,
      instructions: "Please arrive 15 minutes early with your insurance card."
    };
  },
  {
    name: "create_appointment",
    description: "Create a new appointment for a patient",
    schema: AppointmentCreationSchema,
  }
);

// ==================== AGENT CONFIGURATIONS ====================

// Initialize language models
const mainModel = new ChatOllama({ 
  model: "llama3.2:1b",
  temperature: 0.3,
  topP: 0.9
});

const routerModel = new ChatOllama({ 
  model: "llama3.2:1b",
  temperature: 0.1,  // Lower temperature for more consistent classification
  topP: 0.95
});

/**
 * Appointment Management Agent
 * Specializes in handling appointment-related operations
 */
const appointmentAgent = createAgent({
  model: mainModel,
  tools: [searchAppointmentTool, createAppointmentTool],
  systemPrompt: `
# APPOINTMENT MANAGEMENT AGENT

## Role
You are a hospital appointment specialist. Your responsibilities:
1. Search for existing patient appointments
2. Create new appointments based on patient requests
3. Provide appointment details and instructions

## Available Tools
1. search_appointments
   - Searches by patient name and birthday
   - Returns existing appointment details

2. create_appointment
   - Creates new appointments
   - Accepts patient info and optional preferences

## Response Guidelines
- Always use the appropriate tool for the task
- Format responses clearly and professionally
- Include all relevant details: date, time, doctor, instructions
- If information is missing, ask clarifying questions
- End with a helpful follow-up question when appropriate

## Example Interactions
User: "Find my appointment"
Agent: [Uses search_appointments] Found your appointment...

User: "I need to book an appointment"
Agent: [Uses create_appointment] I've scheduled...
  `.trim(),
});

/**
 * Medical Question Answering Agent
 * Specializes in health-related inquiries
 */
const medicalQaAgent = createAgent({
  model: mainModel,
  systemPrompt: `
# MEDICAL QUESTION ANSWERING AGENT

## Role
You are a medical assistant providing preliminary health information.
You support general practitioners during patient screening.

## Responsibilities
1. Answer health-related questions clearly and accurately
2. Identify when symptoms require immediate medical attention
3. Provide general wellness advice
4. Never make diagnoses - only offer information

## Safety Guidelines
⚠️ **CRITICAL**: Always include these disclaimers:
1. "I am an AI assistant, not a medical professional."
2. "This information is for educational purposes only."
3. "Consult with a healthcare provider for medical advice."
4. "For emergencies, call emergency services immediately."

## Response Structure
1. Acknowledge the concern
2. Provide relevant information
3. Include safety disclaimers
4. Suggest when to seek professional help
5. Offer follow-up questions

## Example
User: "I have a headache"
Agent: "Headaches can have various causes... [disclaimers] If severe or persistent, consult a doctor."
  `.trim(),
});

// ==================== WORKFLOW NODES ====================

/**
 * Classifies the user query to determine which agents to invoke
 */
async function classifyUserQuery(state: typeof WorkflowState.State) {
  const startTime = Date.now();
  
  const structuredLlm = routerModel.withStructuredOutput(ClassificationResultSchema);
  
  const classificationPrompt = `
# QUERY CLASSIFICATION TASK

## Objective
Analyze the user's medical query and identify which specialized agents should handle it.

## Available Agents
1. appointments: For appointment-related queries
   - Booking, checking, canceling, rescheduling appointments
   - Appointment inquiries and management

2. medical-qa: For health information queries
   - Symptoms, conditions, treatments
   - Medical advice and information
   - Wellness and prevention

## Classification Rules
- Assign EACH relevant agent (0, 1, or 2 agents)
- Create OPTIMIZED sub-queries for each assigned agent
- Extract key entities: names, dates, symptoms, conditions
- Rate confidence for each classification (0-1)

## Output Format
Return JSON with this exact structure:
{
  "classifications": [
    {
      "source": "appointments",
      "optimizedQuery": "Search appointment for John Doe, birthday 01/15/1980",
      "confidence": 0.95
    }
  ]
}

## Examples

Input: "My name is Maria and I need to book a new appointment for tomorrow"
Output: {
  "classifications": [
    {
      "source": "appointments",
      "optimizedQuery": "Create appointment for Maria for tomorrow at earliest available slot",
      "confidence": 0.98
    }
  ]
}

Input: "I have fever and headache, also need to check my appointment"
Output: {
  "classifications": [
    {
      "source": "medical-qa",
      "optimizedQuery": "What are common causes and treatments for fever with headache?",
      "confidence": 0.92
    },
    {
      "source": "appointments",
      "optimizedQuery": "Search existing appointments for the patient",
      "confidence": 0.87
    }
  ]
}

## Now Classify This Query:
"${state.originalQuery}"
  `.trim();

  try {
    const result = await structuredLlm.invoke([
      { role: "system", content: classificationPrompt }
    ]);

    console.log('[Classification] Results:', JSON.stringify(result, null, 2));
    
    return { 
      classifications: result.classifications,
      metadata: {
        processingTime: Date.now() - startTime,
        sourcesUsed: result.classifications.map(c => c.source)
      }
    };
  } catch (error) {
    console.error('[Classification] Error:', error);
    
    // Fallback to rule-based classification
    const fallbackClassifications = getFallbackClassifications(state.originalQuery);
    
    return {
      classifications: fallbackClassifications,
      metadata: {
        processingTime: Date.now() - startTime,
        sourcesUsed: fallbackClassifications.map(c => c.source),
        error: "LLM classification failed, using fallback"
      }
    };
  }
}

/**
 * Fallback classification using rule-based approach
 */
function getFallbackClassifications(query: string): QueryClassification[] {
  const lowerQuery = query.toLowerCase();
  const classifications: QueryClassification[] = [];
  
  // Appointment-related keywords
  const appointmentKeywords = [
    'appointment', 'appointments', 'book', 'schedule', 'cancel',
    'reschedule', 'check my', 'find my', 'when is my'
  ];
  
  // Medical QA keywords
  const medicalKeywords = [
    'symptom', 'pain', 'fever', 'headache', 'cough', 'hurt',
    'what should i', 'how to treat', 'is it normal',
    'diagnosis', 'treatment', 'medicine', 'medication'
  ];
  
  if (appointmentKeywords.some(keyword => lowerQuery.includes(keyword))) {
    classifications.push({
      source: "appointments",
      optimizedQuery: query,
      confidence: 0.8
    });
  }
  
  if (medicalKeywords.some(keyword => lowerQuery.includes(keyword))) {
    classifications.push({
      source: "medical-qa",
      optimizedQuery: query,
      confidence: 0.8
    });
  }
  
  // Default to medical QA if no clear classification
  if (classifications.length === 0) {
    classifications.push({
      source: "medical-qa",
      optimizedQuery: query,
      confidence: 0.5
    });
  }
  
  return classifications;
}

/**
 * Routes classified queries to appropriate agents
 */
function routeToSpecializedAgents(state: typeof WorkflowState.State): Send[] {
  return state.classifications.map(
    (classification) => new Send(
      classification.source === "appointments" ? "appointments" : "medicalQa",
      { 
        query: classification.optimizedQuery,
        originalQuery: state.originalQuery
      }
    )
  );
}

/**
 * Handles appointment-related queries
 */
async function handleAppointmentQuery(state: { query: string; originalQuery: string }) {
  const startTime = Date.now();
  
  try {
    const result = await appointmentAgent.invoke({
      messages: [{ 
        role: "user", 
        content: `Patient query: ${state.originalQuery}\n\nOptimized task: ${state.query}` 
      }]
    });
    
    const response: AgentResponse = {
      source: "appointments",
      result: result.messages.at(-1)?.content.toString() || "No response from appointment agent",
      timestamp: new Date()
    };
    
    return { 
      agentResponses: [response],
      metadata: {
        processingTime: Date.now() - startTime
      }
    };
  } catch (error) {
    console.error('[Appointment Agent] Error:', error);
    
    return {
      agentResponses: [{
        source: "appointments",
        result: "Unable to process appointment request. Please try again or contact the hospital directly.",
        timestamp: new Date()
      }],
      metadata: {
        error: "Appointment agent execution failed"
      }
    };
  }
}

/**
 * Handles medical questions
 */
async function handleMedicalQuery(state: { query: string; originalQuery: string }) {
  const startTime = Date.now();
  
  try {
    const result = await medicalQaAgent.invoke({
      messages: [{ 
        role: "user", 
        content: `Patient question: ${state.originalQuery}\n\nFocus area: ${state.query}` 
      }]
    });
    
    const response: AgentResponse = {
      source: "medical-qa",
      result: result.messages.at(-1)?.content.toString() || "No response from medical assistant",
      timestamp: new Date()
    };
    
    return { 
      agentResponses: [response],
      metadata: {
        processingTime: Date.now() - startTime
      }
    };
  } catch (error) {
    console.error('[Medical QA Agent] Error:', error);
    
    return {
      agentResponses: [{
        source: "medical-qa",
        result: "Unable to provide medical information at this time. Please consult with a healthcare provider.",
        timestamp: new Date()
      }],
      metadata: {
        error: "Medical QA agent execution failed"
      }
    };
  }
}

/**
 * Synthesizes results from multiple agents into a coherent response
 */
async function synthesizeAgentResponses(state: typeof WorkflowState.State) {
  const startTime = Date.now();
  
  if (state.agentResponses.length === 0) {
    return { 
      finalAnswer: "I couldn't process your request with any of our specialized agents. Please rephrase or contact support.",
      metadata: {
        processingTime: Date.now() - startTime
      }
    };
  }
  
  // Format individual agent responses
  const formattedResponses = state.agentResponses
    .map((response, index) => {
      const sourceLabel = response.source === "appointments" 
        ? "📅 Appointment Information" 
        : "🏥 Medical Information";
      
      return `## ${sourceLabel}\n${response.result}\n`;
    })
    .join("\n---\n\n");
  
  // Generate synthesis using router model
  try {
    const synthesisPrompt = `
# RESPONSE SYNTHESIS TASK

## Original Patient Query
"${state.originalQuery}"

## Agent Responses
${formattedResponses}

## Synthesis Instructions
Create a FINAL, COHESIVE response that:
1. Addresses the original query directly
2. Integrates information from all relevant sources
3. Maintains a professional, empathetic tone
4. Includes any important disclaimers
5. Ends with a helpful follow-up or next steps

## Structure:
- Opening addressing the patient's main concern
- Integrated information from all sources
- Clear next steps or recommendations
- Required disclaimers (medical/legal)

## Final Response:
    `.trim();
    
    const synthesisResult = await routerModel.invoke([
      { role: "system", content: synthesisPrompt }
    ]);
    
    return {
      finalAnswer: synthesisResult.content,
      metadata: {
        processingTime: Date.now() - startTime
      }
    };
  } catch (error) {
    console.error('[Synthesis] Error:', error);
    
    // Fallback synthesis
    const fallbackAnswer = `
Based on your query: "${state.originalQuery}"

${formattedResponses}

**Important**: This information is provided by AI assistants. 
For medical concerns, consult a healthcare professional. 
For appointment issues, contact the hospital directly.
    `.trim();
    
    return {
      finalAnswer: fallbackAnswer,
      metadata: {
        processingTime: Date.now() - startTime,
        error: "Synthesis LLM failed, using fallback"
      }
    };
  }
}

// ==================== WORKFLOW CONSTRUCTION ====================

/**
 * Builds and compiles the state graph workflow
 */
function buildWorkflow() {
  const workflow = new StateGraph(WorkflowState)
    // Core nodes
    .addNode("classify", classifyUserQuery)
    .addNode("appointments", handleAppointmentQuery)
    .addNode("medicalQa", handleMedicalQuery)
    .addNode("synthesize", synthesizeAgentResponses)
    
    // Routing
    .addEdge(START, "classify")
    .addConditionalEdges(
      "classify", 
      routeToSpecializedAgents, 
      ["appointments", "medicalQa"]
    )
    .addEdge("appointments", "synthesize")
    .addEdge("medicalQa", "synthesize")
    .addEdge("synthesize", END)
    
    // Compile the workflow
    .compile();
    
  return workflow;
}

// ==================== MAIN EXECUTION ====================

/**
 * Example usage and test execution
 */
async function runExample() {
  console.log("🚀 Starting Medical Assistant Workflow\n");
  
  const workflow = buildWorkflow();
  
  const testQueries = [
    "My name is Henrique and my birthday is 04/09/1994, I want to check my appointment information",
    "I have a fever and headache, should I come in for an appointment?",
    "Book me an appointment for next week and also tell me about flu symptoms",
  ];
  
  for (const query of testQueries) {
    console.log(`\n🔍 Processing Query: "${query}"`);
    console.log("─".repeat(60));
    
    try {
      const result = await workflow.invoke({
        originalQuery: query,
        
      });
      
      console.log("📋 Classifications:");
      result.classifications?.forEach((c, i) => {
        console.log(`  ${i + 1}. ${c.source.toUpperCase()} (${(c.confidence * 100).toFixed(0)}%): ${c.optimizedQuery}`);
      });
      
      console.log("\n✅ Final Answer:");
      console.log(result.finalAnswer);
      
      console.log("\n📊 Metadata:");
      
      console.log("\n" + "=".repeat(60));
    } catch (error) {
      console.error(`❌ Error processing query:`, error);
    }
  }
}

/**
 * Export for use as a module
 */
export const MedicalAssistantWorkflow = {
  /**
   * Execute the workflow with a patient query
   */
  async processQuery(query: string) {
    const workflow = buildWorkflow();
    
    const result = await workflow.invoke({
      originalQuery: query,
      
    });
    
    return {
      answer: result.finalAnswer,
      sources: result.classifications?.map(c => c.source) || [],
      confidence: Math.min(...(result.classifications?.map(c => c.confidence) || [0])),
    };
  },
  
  /**
   * Get workflow statistics and info
   */
  getInfo() {
    return {
      name: "Medical Assistant Multi-Agent System",
      version: "1.0.0",
      description: "Routes medical queries to specialized agents",
      agents: ["appointments", "medical-qa"],
      capabilities: [
        "Appointment management",
        "Medical Q&A",
        "Multi-source synthesis"
      ]
    };
  }
};

// Execute example if run directly
if (require.main === module) {
  runExample().catch(console.error);
}

export default MedicalAssistantWorkflow;