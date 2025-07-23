
import OpenAI from "openai";

let openai: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Please define the OPENAI_API_KEY environment variable inside .env.local');
  }

  if (!openai) {
    openai = new OpenAI({ apiKey });
  }

  return openai;
}
