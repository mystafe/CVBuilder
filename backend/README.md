# CVBuilder Backend API

Express.js backend with OpenAI integration for CV processing and enhancement.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` file:

```bash
cp .env.example .env
```

3. Add your OpenAI API key to `.env`:

```
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
PORT=4000
```

4. Start the server:

```bash
npm run dev
```

## API Endpoints

All endpoints are POST requests with JSON payloads:

### `/api/ai/parse`

Parse raw CV text into structured data

```json
{
  "rawText": "CV text content...",
  "template": {} // optional
}
```

### `/api/ai/questions`

Generate enhancement questions

```json
{
  "cv": {...},
  "count": 4
}
```

### `/api/ai/improve`

Improve CV with answers

```json
{
  "cv": {...},
  "answers": {...}
}
```

### `/api/ai/score`

Score and analyze CV

```json
{
  "cv": {...}
}
```

### `/api/ai/coverletter`

Generate cover letter

```json
{
  "cv": {...},
  "roleHint": "optional job description"
}
```

## Features

- Rate limiting (60 requests/minute)
- CORS enabled
- Helmet security
- Input validation with Zod
- Comprehensive error handling
- OpenAI GPT integration
- Structured JSON responses
