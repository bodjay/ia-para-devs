import env from "dotenv";
import weatherAgent from "./agents/agente-meteorologico-local.js";
import doctorAgent from "./agents/doctor-hugging-face-graph.js";

env.config();

export default {
  weatherAgent,
  doctorAgent,
};