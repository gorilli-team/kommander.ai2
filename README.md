# Kommander.ai Prototype

Kommander.ai is a prototype built with **Next.js** and **TypeScript** that demonstrates a dashboard for FAQ management, file uploads and a chat interface powered by OpenAI. Uploaded files are stored in MongoDB GridFS and the text from the most recent upload is extracted on demand using `pdf-parse` or `mammoth`. The chatbot uses the FAQs together with that extracted text when generating a reply. Responses rely on relevant snippets pulled from the document rather than any stored summaries.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
   The project uses OCR via `tesseract.js`. Building its dependencies (notably `canvas` for PDF rendering) may require system libraries such as `libcairo2-dev` and `libjpeg-dev` on Linux.
2. Create a `.env.local` file in the project root and provide the required environment variables:
   ```dotenv
   OPENAI_API_KEY=your-openai-key
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
   AUTH_SECRET=your-auth-secret
   NEXTAUTH_URL=http://localhost:9002
   RESEND_API_KEY=your-resend-key          # optional, for email features
   EMAIL_FROM="Kommander.ai Proto <onboarding@resend.dev>"  # optional
  BYPASS_AUTH=true                         # optional, bypasses login in dev
  MAX_PROMPT_FILES=3                       # number of recent uploaded files referenced per chat request (default: 3)
   ```

## Running the project

- Start the development server on [http://localhost:9002](http://localhost:9002):
  ```bash
  npm run dev
  ```
- Optionally seed example data:
  ```bash
  npm run seed
  ```
- For a production build:
  ```bash
  npm run build
  npm start
  ```

This README provides only a brief overview. See the source code and comments for more details on each feature.

## Embeddable Chat Widget

To embed the Kommander.ai chat widget on any website, include the following snippet:

```html
<script src="https://cdn.kommander.ai/widget.js" data-client-id="abc123" data-api-key="sk_live_xyz"></script>
```

## Limitations

- Only the most recently uploaded document is considered when generating chat responses.
- The application does not perform OCR on images or scanned PDFs.
- Installing optional packages (e.g., OCR libraries) may fail in environments without network access.

