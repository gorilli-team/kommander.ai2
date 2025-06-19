# Kommander.ai Prototype

Kommander.ai is a prototype built with **Next.js** and **TypeScript** that demonstrates a simple dashboard with FAQ management, file uploads, and a chat interface backed by OpenAI. Uploaded documents are summarized using the OpenAI API and stored in MongoDB. A generative chatbot uses the FAQs and document summaries to answer questions in the chat UI.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env.local` file in the project root and provide the required environment variables:
   ```dotenv
   OPENAI_API_KEY=your-openai-key
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
   AUTH_SECRET=your-auth-secret
   NEXTAUTH_URL=http://localhost:9002
   RESEND_API_KEY=your-resend-key          # optional, for email features
   EMAIL_FROM="Kommander.ai Proto <onboarding@resend.dev>"  # optional
   BYPASS_AUTH=true                         # optional, bypasses login in dev
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

## Embedding the Chat Widget

Add this snippet to the `<body>` of any site where you want the Kommander.ai assistant to appear:

```html
<script src="https://cdn.kommander.ai/widget.js"
        data-client-id="clt_1234"
        data-api-key="sk_live_5678"></script>
```

### Security Notes

- **CORS:** Allow requests from your site to the Kommander.ai domain.
- **Domain Binding:** Bind your widget to specific domains in the dashboard so third parties cannot reuse your key.
- **Rate Limits:** API usage is rate-limited; contact support if you expect high traffic.
