# One Shot Commentary

A Next.js application that triggers an Agora AI Agent with user-defined context to generate a single response, then stops the agent.

## Features

* 🎤 **Agora WebSDK Integration** - Real-time audio communication
* 💬 **Agora RTM 2.x SDK** - Real-time messaging
* 🤖 **Agora ConvoAI** - AI agent triggered via REST API
* 🎨 **Audio Visualization** - Visual feedback for agent audio output
* 🔒 **Secure API Routes** - Proxy endpoints to protect API keys

## Tech Stack

* **Framework**: Next.js 14
* **UI Library**: React 18
* **Real-time Communication**: Agora RTC SDK NG
* **Messaging**: Agora RTM 2.x SDK
* **AI Services**: Agora ConvoAI REST API

## Prerequisites

* Node.js 18+ and npm
* Agora account with:
  * Agora App ID
  * Agora Username and Password (for REST API)
* Public URL for your deployment (for Agora AI Agent callbacks)

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd OneShotCommentary
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file in the root directory:

```bash
cp env.example .env.local
```

4. Update `.env.local` with your credentials:

```env
# Agora API Configuration
AGORA_USERNAME=your_agora_username
AGORA_PASSWORD=your_agora_password
AGORA_APP_ID=your_agora_app_id

# Public URL Configuration
# In production: your Vercel deployment URL (e.g., https://your-app.vercel.app)
# In development: your ngrok URL (e.g., https://abc123.ngrok.io)
PUBLIC_URL=https://your-app.vercel.app

# Optional: LLM Configuration (if using custom LLM)
LLM_URL=https://your-llm-endpoint.com/chat/completions
LLM_API_KEY=your_llm_api_key
```

## Development

1. Run the development server:

```bash
npm run dev
```

2. For local development, expose your server with ngrok:

```bash
ngrok http 3000
```

3. Update `.env.local` with your ngrok URL:

```env
PUBLIC_URL=https://your-ngrok-url.ngrok.io
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Production Build

Build the application for production:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## Project Structure

```
OneShotCommentary/
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   └── completions/     # LLM proxy endpoint
│   │   ├── sendrtm/             # RTM message handler
│   │   ├── start-conversation/  # Initialize Agora AI Agent
│   │   └── stop-conversation/  # Stop conversation
│   ├── components/
│   │   └── AudioVisualizer.jsx  # Audio visualization component
│   ├── globals.css              # Global styles
│   ├── layout.js                # Root layout
│   └── page.jsx                 # Main application page
├── env.example                  # Environment variables template
├── next.config.js              # Next.js configuration
└── package.json                # Dependencies and scripts
```

## API Routes

### `/api/start-conversation`

Initializes a new Agora AI Agent conversation. Accepts configuration parameters in the request body.

**Request Body:**
```json
{
  "channelName": "optional-channel-name",
  "context": "User-defined context for the AI agent",
  "agentId": "optional-agent-id",
  "agentName": "optional-agent-name",
  "llmProvider": "custom",
  "llmModel": "gpt-4",
  "temperature": 0.7,
  "maxTokens": 500,
  "ttsProvider": "azure",
  "ttsVoice": "en-US-JennyNeural",
  "ttsKey": "optional-tts-key",
  "ttsRegion": "eastus"
}
```

### `/api/stop-conversation`

Stops the active conversation and cleans up resources.

**Request Body:**
```json
{
  "conversationId": "conversation-id-from-start-response"
}
```

### `/api/chat/completions`

Proxy endpoint that forwards LLM requests from Agora AI Agent to your LLM service (if using custom LLM).

### `/api/sendrtm`

Handles RTM (Real-Time Messaging) messages for agent state updates.

## How It Works

1. **User clicks "Start Agent"** which:
   * Creates an Agora RTC channel
   * Initializes Agora RTC and RTM clients
   * Publishes local microphone audio
   * Calls `/api/start-conversation` with user-defined context
   * Agora AI Agent joins the channel and processes the context
   * Agent generates a single response and speaks it
2. **Audio visualization** displays the agent's audio output in real-time
3. **User clicks "Stop Agent"** which:
   * Calls `/api/stop-conversation` to stop the agent
   * Cleans up RTC and RTM connections
   * Stops audio tracks

## Environment Variables

| Variable        | Description                        | Required |
| --------------- | ---------------------------------- | -------- |
| AGORA_USERNAME  | Agora REST API username            | Yes      |
| AGORA_PASSWORD  | Agora REST API password            | Yes      |
| AGORA_APP_ID    | Agora application ID               | Yes      |
| PUBLIC_URL      | Public URL for Agora callbacks     | Yes      |
| LLM_URL         | LLM API endpoint URL (optional)    | No       |
| LLM_API_KEY     | LLM API authentication key (optional) | No    |

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Development with ngrok

For local development, use ngrok to expose your local server:

```bash
ngrok http 3000
```

Update `PUBLIC_URL` in `.env.local` with your ngrok URL.

## Browser Compatibility

* Chrome (recommended)
* Firefox
* Safari
* Edge

Note: Microphone permissions are required for voice conversations.

## License

Private - All rights reserved

