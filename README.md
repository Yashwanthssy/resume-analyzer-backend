# ResumeAI Backend

The server-side API built with NestJS. This handles PDF processing, AI integration, and data persistence.

## Why NestJS?

After working with Express for a while, I wanted to try something more structured. NestJS gave me:
- Built-in TypeScript support (no configuration headaches)
- Dependency injection out of the box
- Modular architecture that scales well
- Great documentation and community

## Architecture Overview

The backend is organized into modules:

### Resume Module
Handles all resume-related operations:
- File upload and validation
- PDF text extraction
- Analysis orchestration
- CRUD operations for history

### Groq Module
Encapsulates AI service integration:
- API communication with Groq
- Prompt engineering
- Response parsing and validation
- Error handling for AI failures

## Development Setup

```bash
# Install dependencies
npm install

# Start in development mode
npm run start:dev

# Build for production
npm run build
npm run start:prod
```

## Environment Variables

Create a `.env` file in the Backend directory:

```env
# Groq AI Configuration
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/resumeai

# Server Configuration
PORT=3000
```

Get your Groq API key from: https://console.groq.com

## Database Setup

I'm using PostgreSQL with TypeORM. The schema is simple:

```sql
resume_analyses
├── id (uuid, primary key)
├── fileName (string)
├── jobDescription (text)
├── analysisResult (jsonb)  -- Stores the full AI response
└── createdAt (timestamp)
```

TypeORM handles migrations automatically in development (synchronize: true).

**Note**: In production, you should use proper migrations instead of auto-sync.

## API Documentation

### Analyze Resume
```http
POST /resume/analyze
Content-Type: multipart/form-data

resume: [PDF file]
jobDescription: [Job posting text]
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "fileName": "resume.pdf",
    "matchScore": 78,
    "summary": "...",
    "strengths": [...],
    "missingKeywords": [...],
    "suggestions": [...],
    "verdict": "Good Match"
  }
}
```

### Get History
```http
GET /resume/history
```

Returns array of all analyses with basic info.

### Get Analysis Details
```http
GET /resume/history/:id
```

Returns full analysis including all suggestions.

### Delete Analysis
```http
DELETE /resume/history/:id
```

Removes an analysis from history.

## Key Implementation Details

### PDF Processing
Using `pdf-parse` library to extract text from uploaded PDFs. Had to add error handling for:
- Corrupted PDFs
- Password-protected files
- Scanned images (no text layer)

### AI Integration
The trickiest part was getting consistent responses from the LLM. My approach:
1. **Strict system prompt** - Tell the AI exactly what format to use
2. **JSON validation** - Parse and validate the response
3. **Retry logic** - Handle API failures gracefully
4. **Prompt engineering** - Prevent hallucinations by being explicit

Example prompt structure:
```typescript
const systemPrompt = `You are an expert ATS system.
CRITICAL RULES:
1. ONLY use information explicitly in the resume
2. DO NOT invent skills or experiences
3. Respond with valid JSON only
...`;
```

### File Upload Security
- Max file size: 5MB
- Only PDF files allowed
- Validation before processing
- Files stored in memory (not disk)

### Error Handling
Implemented global exception filters for:
- Validation errors (400)
- File size errors (413)
- AI service failures (500)
- Database errors (500)

## Performance Considerations

- **Async/await everywhere** - Non-blocking I/O
- **Connection pooling** - PostgreSQL connections reused
- **Streaming uploads** - Memory-efficient file handling
- **Caching** - Could add Redis for frequently accessed analyses

## Testing Strategy

Would add:
- Unit tests for services
- Integration tests for controllers
- E2E tests for critical flows
- Mock Groq API for testing

## Deployment Considerations

For production, you'd want to:
- [ ] Use proper database migrations
- [ ] Add rate limiting
- [ ] Implement authentication
- [ ] Set up logging (Winston/Pino)
- [ ] Add monitoring (Sentry)
- [ ] Use environment-specific configs
- [ ] Enable HTTPS
- [ ] Add request validation middleware

## What I Learned

- NestJS's module system is really powerful
- TypeORM makes database work much easier
- Prompt engineering is an art form
- Error handling is crucial for AI integrations
- Dependency injection makes testing easier

## Troubleshooting

**"GROQ_API_KEY not defined"**
- Make sure .env file exists and has the key

**"Cannot connect to database"**
- Check PostgreSQL is running
- Verify DATABASE_URL is correct

**"Model decommissioned" error**
- Update GROQ_MODEL in .env to current model
- Check Groq docs for available models

**PDF parsing fails**
- Ensure PDF has text layer (not scanned image)
- Check file isn't corrupted
- Verify file size under 5MB
