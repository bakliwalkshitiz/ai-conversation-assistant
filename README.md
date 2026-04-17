# TwinMind — Live AI Meeting Copilot

I've built a full-stack web application that captures live audio from the microphone, transcribes it in real-time, and generates useful meeting suggestions every 30 seconds. You can also click on any suggestion to open a chat and ask follow-up questions.

I spent a lot of time making sure the prompts generate actually useful suggestions rather than generic text, and I chose to implement a dedicated backend to make the app more robust and production-ready.

---

## How to Run It

### 1. Install packages
```bash
npm install
```

### 2. Start the project
```bash
npm run dev
```
*(This uses `concurrently` to run both the Vite frontend and the Express backend at the same time).*

### 3. Add your API Key
Open `http://localhost:5173`. Click the **Settings** button in the top right corner and paste your Groq API key. Then hit the Start button and start talking!

---

## Why I Built a Backend (Even though Groq allows browser calls)

While Groq's API actually works directly from the browser because they allow CORS, I decided to build a Node.js/Express backend anyway. Here is why:

1. **Better Audio Handling**: Browsers produce audio Blobs. Handling `multipart/form-data` uploads is much cleaner and more reliable on a Node server using `multer` than trying to craft the multipart form perfectly in the browser.
2. **Security & Best Practices**: In a real-world app, you never want your API calls to third-party services happening directly from the client. By routing everything through `/api/transcribe` and `/api/suggestions`, the frontend doesn't need to know how the AI works under the hood.
3. **Clean SSE Streaming**: The chat feature streams responses token-by-token. Handling Server-Sent Events (SSE) proxying from the backend to the frontend was a fun challenge and makes the UI feel very fast.

---

## My Prompt Engineering Strategy

Getting the AI to give good suggestions was the hardest but most interesting part of this project.

### 1. The Live Suggestions (The 3 Cards)
- **Context Window**: I decided to only pass the last **600 words** of the transcript to the model for the live suggestions. I realized that if I passed the *entire* meeting history every 30 seconds, the model would get confused and suggest things from 10 minutes ago. 600 words covers about the last 4-5 minutes of speech, which is perfect for figuring out "what to do right now".
- **JSON Formatting**: I strictly prompt the model to return a JSON array of strings. My backend parses this and strips any markdown code blocks so the UI never breaks.
- **Variety**: The prompt specifically asks for a mix of things (like a question to ask, an insight, or a clarification) so the user doesn't just get 3 generic summaries.

### 2. The Chat Panel
- For the chat panel, I *do* pass the entire transcript. Since the user might ask "What did we talk about at the beginning?", the chat model needs the full context to be helpful. 
- I also inject the exact text of the suggestion they clicked into the prompt, so the AI knows exactly what they are asking to expand on.

---

## Tech Stack Used

- **Frontend**: HTML, Vanilla JS, CSS (No React/Vue). I wanted to show that I can write clean, modular JavaScript and manage state without relying on heavy frameworks. Vite is used just for bundling and running the dev server.
- **Backend**: Node.js and Express.
- **AI Models**: 
  - `whisper-large-v3` for fast transcription.
  - `llama-3.3-70b-versatile` for the LLM logic (it's fast and very smart at following strict JSON instructions).

---

## File Structure

I organized the code cleanly so the frontend and backend are completely separate:

```text
TwinMind/
├── backend/                     # API Proxy Layer
│   ├── index.js                 # Express server entry point (Port 3001)
│   └── routes/
│       ├── transcribe.js        # Handles audio upload & Whisper API calls
│       ├── suggestions.js       # Handles contextual LLM suggestions
│       └── chat.js              # Handles SSE chat streaming
├── frontend/                    # Client Application
│   ├── index.html               # 3-Column UI Layout
│   ├── vite.config.js           # Vite dev server (Port 5173)
│   └── src/                     
│       ├── main.js              # Core UI orchestration and event listeners
│       ├── state.js             # Centralized state management & prompts
│       ├── audio.js             # MediaRecorder API chunking logic
│       ├── style.css            # Custom Design System (Dark Theme)
│       └── ...                  # Feature-specific modules (chat, export, etc.)
└── package.json                 # Monorepo scripts and dependencies
```

Thanks for reviewing my code! I had a great time building this and learning how to stream audio chunks and AI tokens properly.
