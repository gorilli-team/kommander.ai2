# Kommander.ai Prototype

Kommander.ai is a prototype built with **Next.js** and **TypeScript** that demonstrates a dashboard for FAQ management, file uploads and a chat interface powered by OpenAI. Uploaded files are stored in MongoDB GridFS and the text from the most recent upload is extracted on demand using `pdf-parse` or `mammoth`. The chatbot uses the FAQs together with that extracted text when generating a reply. Responses rely on relevant snippets pulled from the document rather than any stored summaries.

## Setup

1. Install dependencies:

   ```bash
   npm install

	2.	Create a .env.local file in the project root and provide the required environment variables:

OPENAI_API_KEY=your-openai-key
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
AUTH_SECRET=your-auth-secret
NEXTAUTH_URL=http://localhost:9002
RESEND_API_KEY=your-resend-key          # optional, for email features
EMAIL_FROM="Kommander.ai Proto <onboarding@resend.dev>"  # optional
BYPASS_AUTH=true                         # optional, bypasses login in dev
MAX_PROMPT_FILES=3                       # limits how many files are used for building the prompt (default: 3)



Running the project
	•	Start the development server on http://localhost:9002:

npm run dev


	•	Optionally seed example data:

npm run seed


	•	For a production build:

npm run build
npm start



This README provides only a brief overview. See the source code and comments for more details on each feature.

Embeddable Chat Widget

To embed the Kommander.ai chat widget on any website, use the snippet below. It references your deployed instance (via NEXT_PUBLIC_BASE_URL) and includes a userId to link the chat to a specific account:

<div id="kommander-chatbot"></div>
<script src="https://kommanderai.vercel.app/chatbot.js"></script>
<script>
  window.initKommanderChatbot({ userId: 'YOUR_USER_ID' });
</script>

The /api/kommander-query endpoint returns CORS headers so the widget can be used from any origin.
	•	Make sure the script URL points to your deployed chatbot.js file (e.g., https://kommanderai.vercel.app/chatbot.js).
	•	Replace 'YOUR_USER_ID' with the actual user identifier from your system.
	•	The chat widget will automatically mount inside the container and connect to the correct context (files + FAQs) for that user.

### Rebuilding the widget

Run `npm run build:widget` to regenerate `public/chatbot.js` and `public/chatbot.css` using esbuild and Tailwind. This bundles `ChatbotWidget.tsx` **along with React and ReactDOM**, keeping the widget styles in sync with the main app and letting the script run on pages that don’t already load React.

Limitations
        •       Only a limited number of the most recently uploaded documents are used when generating chat responses (controlled by MAX_PROMPT_FILES).
        •       The application does not perform OCR on images or scanned PDFs; PDFs without embedded text will be ignored.
        •       Installing optional packages (e.g., OCR libraries) may fail in environments without network access.
