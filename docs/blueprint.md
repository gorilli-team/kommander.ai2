# **App Name**: Kommander.ai Proto

## Core Features:

- Dashboard Layout: Dashboard layout with a persistent sidebar for navigation.
- FAQ Form: FAQ Form to input questions and answers, with client-side validation using React Hook Form and Zod.
- File Uploader: File uploader that supports PDF, DOCX, and TXT files. Displays upload progress and previews the content.
- Document Parsing & Summarization: Backend file processing tool: Parse uploaded documents into chunks, summarize them using OpenAI, and save the summaries to MongoDB.
- FAQ List: Display list of FAQs, which will persist upon refresh due to fetching of information from backend/database.
- Chat UI: Chat interface with message bubbles, timestamps, automatic scrolling, and a 'bot is typing' indicator.
- Intelligent Chatbot Responses: Generative AI that assembles a prompt from FAQs and document summaries, then uses the prompt as context to generate a response using OpenAI's API.

## Style Guidelines:

- Primary color: Desaturated teal (#73BDBF) to inspire calm, trust, and knowledge, without being distracting.
- Background color: Very light gray (#F0F2F5) for a clean and professional look.
- Accent color: Pale cyan (#91E8E1) to provide subtle highlighting and interactivity.
- Font: 'Inter' (sans-serif) for a modern and neutral look suitable for both headlines and body text.
- Minimalist line icons for sidebar navigation and UI actions.
- Clean and well-spaced layout to facilitate readability and usability.
- Subtle animations and transitions for UI feedback, such as loading states and message delivery.