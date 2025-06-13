import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error('Please define the OPENAI_API_KEY environment variable inside .env.local');
}

const openai = new OpenAI({ apiKey });

export default openai;
