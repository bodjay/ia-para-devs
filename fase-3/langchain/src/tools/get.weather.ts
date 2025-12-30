import { tool } from "langchain";
import * as z from "zod";

const getWeather = tool(
  (input) => {
    const { city } = input;
    const temperature = Math.floor(Math.random() * 25) + 10;

    return {
      city,
      temperature: temperature + "°C",
    };
  },
  {
    name: "get_weather",
    description: "Get the weather for a given city",
    schema: z.object({
      city: z.string().describe("The city to get the weather for"),
    }),
    responseFormat: "json",
  }
);

export default getWeather;