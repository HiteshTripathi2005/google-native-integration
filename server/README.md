# RAG Learning Server

A Fastify-based backend server for an AI-powered RAG (Retrieval-Augmented Generation) chat system with Google Calendar integration.

## Features

- **AI Chat**: Streaming conversations with OpenRouter/Gemini 2.0 Flash
- **Conversation Memory**: Persistent chat history in PostgreSQL
- **RAG Ready**: Vector embeddings support for document storage
- **Google Calendar Tools**: Full calendar management via AI
- **Real-time Tools**: Time information and calendar operations

## Tech Stack

- **Framework**: Fastify (Node.js)
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: OpenRouter API with Gemini 2.0 Flash
- **Tools**: Vercel's AI SDK for tool calling
- **Calendar API**: Google Calendar API

## Setup

### 1. Environment Variables

Create a `.env` file:

```bash
PORT=3001
OPENROUTER_API_KEY=your-openrouter-api-key
DATABASE_URL=postgresql://user:password@localhost:5432/rag_learning
```

### 2. Database Setup

```bash
# Generate and run migrations
npm run generate
npm run migrate
```

### 3. Google Calendar API Setup (Required for Calendar Tools)

#### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable Google Calendar API

#### Step 2: Create OAuth Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Choose "Desktop application" as application type
4. Download the credentials JSON file

#### Step 3: Configure Credentials
1. Copy `credentials.json.example` to `credentials.json`
2. Replace with your downloaded credentials
3. The file should look like:
```json
{
  "installed": {
    "client_id": "xxx.apps.googleusercontent.com",
    "project_id": "your-project-id",
    "client_secret": "xxx",
    "redirect_uris": ["http://localhost"]
  }
}
```

#### Step 4: First Run Authentication
On first use, the calendar tools will automatically prompt for OAuth authentication in your browser.

## Available Tools

### Calendar Tools
- **listCalendars**: List all available Google Calendars
- **listEvents**: List events from a calendar with filtering
- **searchEvents**: Search events by text query
- **createEvent**: Create new calendar events
- **updateEvent**: Update existing events
- **deleteEvent**: Delete calendar events

### Utility Tools
- **time**: Get current time in any timezone

## API Endpoints

### POST `/ai/streamtext`
Main AI chat endpoint with streaming responses.

**Request Body:**
```json
{
  "prompt": "Schedule a meeting tomorrow at 2 PM",
  "conversationId": "optional-custom-id"
}
```

**Response:** Server-sent events stream of AI response.

### GET `/ai/messages`
Retrieve conversation history.

### DELETE `/ai/messages`
Clear conversation history.

## Development

```bash
# Install dependencies
npm install

# Development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Usage Examples

The AI can now handle calendar operations naturally:

- "What meetings do I have this week?"
- "Schedule a 1-hour meeting with john@example.com tomorrow at 3 PM"
- "Find all events containing 'project' in my work calendar"
- "Cancel my dentist appointment next Tuesday"
- "List all my calendars"

## Architecture

```
Client (Next.js) ← HTTP → Fastify Server
                           ↓
                    PostgreSQL (messages, documents)
                           ↓
                    AI Tools (Calendar, Time, RAG)
                           ↓
                    OpenRouter API + Google Calendar API
```
