require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const { z } = require('zod')

const app = express()
const PORT = process.env.PORT || 4000

// Middleware setup
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))

// Rate limiting - 60 requests per minute
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
})
app.use(limiter)

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
  next()
})

// Validation schemas
const parseSchema = z.object({
  rawText: z.string().optional(),
  template: z.object({}).optional()
})

const questionsSchema = z.object({
  cv: z.object({}),
  count: z.number().int().min(1).max(10)
})

const improveSchema = z.object({
  cv: z.object({}),
  answers: z.object({})
})

const scoreSchema = z.object({
  cv: z.object({})
})

const coverLetterSchema = z.object({
  cv: z.object({}),
  roleHint: z.string().optional()
})

// OpenAI API helper
async function callOpenAI(messages, maxTokens = 2000) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
  } catch (error) {
    console.error('OpenAI API call failed:', error)
    throw error
  }
}

// Error handling middleware
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

// API Routes

// Parse CV endpoint
app.post('/api/ai/parse', asyncHandler(async (req, res) => {
  const validation = parseSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      error: 'Invalid input',
      details: validation.error.errors
    })
  }

  const { rawText, template } = validation.data

  // If no rawText provided, return empty skeleton
  if (!rawText || rawText.trim() === '') {
    const emptySkeleton = {
      personalInfo: {
        name: "",
        email: "",
        phone: "",
        location: ""
      },
      summary: "",
      experience: [],
      education: [],
      skills: [],
      projects: [],
      links: [],
      certificates: [],
      languages: [],
      references: []
    }
    return res.json(emptySkeleton)
  }

  const systemPrompt = `You are an expert CV parser. Extract structured information from raw CV text and return it as JSON.

REQUIRED JSON STRUCTURE (follow this exact format):
{
  "personalInfo": {
    "name": "string",
    "email": "string", 
    "phone": "string",
    "location": "string"
  },
  "summary": "string",
  "experience": [
    {
      "title": "string",
      "company": "string", 
      "location": "string",
      "start": "YYYY-MM or YYYY",
      "end": "YYYY-MM or YYYY or Present",
      "bullets": ["bullet point 1", "bullet point 2"]
    }
  ],
  "education": [
    {
      "degree": "string",
      "institution": "string",
      "location": "string", 
      "start": "YYYY-MM or YYYY",
      "end": "YYYY-MM or YYYY",
      "gpa": "string (optional)"
    }
  ],
  "skills": [
    {
      "name": "string",
      "category": "Programming|Tools|Frameworks|Languages|Soft Skills|Other",
      "level": "Beginner|Intermediate|Advanced|Expert"
    }
  ],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "technologies": ["tech1", "tech2"],
      "url": "string (optional)",
      "start": "YYYY-MM or YYYY (optional)",
      "end": "YYYY-MM or YYYY (optional)"
    }
  ],
  "links": [
    {
      "type": "LinkedIn|GitHub|Portfolio|Website|Other",
      "url": "string",
      "label": "string"
    }
  ],
  "certificates": ["string"],
  "languages": [
    {
      "language": "string",
      "proficiency": "Native|Fluent|Advanced|Intermediate|Beginner"
    }
  ],
  "references": [
    {
      "name": "string",
      "contact": "string",
      "relationship": "string"
    }
  ]
}

EXTRACTION RULES:
1. Extract ONLY information clearly present in the text
2. Normalize dates to YYYY-MM format (or just YYYY if month unknown)
3. Split job descriptions into bullet points
4. Categorize skills appropriately 
5. Clean formatting and remove extra whitespace
6. If a section has no data, include it as empty array/object
7. Use "Present" for current positions
8. Return ONLY valid JSON, no explanations or markdown`

  const userPrompt = `Parse this CV text and extract structured information:

${rawText}

If the input is empty or contains no useful CV information, return an empty skeleton with all fields present but empty arrays/strings.

Return ONLY the JSON object following the exact structure specified in the system prompt.`

  try {
    const result = await callOpenAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], 3000)

    const parsedData = JSON.parse(result)
    console.log('CV parsed successfully')
    res.json(parsedData)
  } catch (error) {
    console.error('Parse CV error:', error)
    res.status(500).json({
      error: 'Failed to parse CV',
      message: error.message
    })
  }
}))

// Generate questions endpoint
app.post('/api/ai/questions', asyncHandler(async (req, res) => {
  const validation = questionsSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      error: 'Invalid input',
      details: validation.error.errors
    })
  }

  const { cv, count } = validation.data

  const systemPrompt = `You are a professional career counselor. Generate insightful questions to help improve a CV/resume.

Based on the provided CV, create questions that will help gather additional information to enhance the profile. Focus on:
- Missing achievements and quantifiable results
- Skills demonstration and impact
- Leadership and collaboration experiences
- Professional growth and learning
- Industry-specific accomplishments

Return exactly ${count} questions as JSON in this format:
{
  "questions": [
    {
      "id": "q1",
      "question": "What was your biggest achievement in your current/most recent role?",
      "category": "achievements",
      "hint": "Focus on quantifiable results and business impact"
    }
  ]
}

Make questions specific to their background and industry when possible.`

  const userPrompt = `Based on this CV, generate ${count} targeted questions to help improve their profile:

CV Data: ${JSON.stringify(cv, null, 2)}

Generate questions that will help uncover missing achievements, quantify impact, and highlight their unique value proposition.`

  try {
    const result = await callOpenAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], 1500)

    const questionsData = JSON.parse(result)
    console.log(`Generated ${count} questions successfully`)
    res.json(questionsData)
  } catch (error) {
    console.error('Generate questions error:', error)
    res.status(500).json({
      error: 'Failed to generate questions',
      message: error.message
    })
  }
}))

// Improve CV endpoint
app.post('/api/ai/improve', asyncHandler(async (req, res) => {
  const validation = improveSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      error: 'Invalid input',
      details: validation.error.errors
    })
  }

  const { cv, answers } = validation.data

  const systemPrompt = `You are an expert CV writer and career coach. Merge user answers into the existing CV JSON, enhancing clarity and impact while preserving structure.

CRITICAL REQUIREMENTS:
1. Output ONLY valid JSON in the exact same structure as input CV
2. Preserve ALL existing data unless directly contradicted by answers
3. Use dates in ISO format (YYYY-MM) consistently
4. Enhance bullet points with quantified metrics when provided
5. Integrate answers strategically into appropriate CV sections

ENHANCEMENT RULES:
- Merge answers into relevant experience/education/skills sections
- Convert vague descriptions into specific, quantified achievements
- Add metrics, percentages, dollar amounts when mentioned in answers
- Use action verbs: led, developed, implemented, optimized, increased, reduced
- Maintain professional tone and formatting consistency
- If answers contradict existing data, use the answer information
- If answers provide new information, add it to appropriate sections
- Keep all arrays (experience, education, skills, etc.) intact unless adding new items

DATE FORMATTING:
- Always use YYYY-MM format for start/end dates
- Use "Present" for current positions
- Convert any date format in answers to YYYY-MM

BULLET POINT ENHANCEMENT:
- Transform "responsible for X" into "Led X initiative resulting in Y"
- Add quantified impact: "Increased sales by 25%" vs "Increased sales"
- Include specific technologies, methodologies, team sizes when mentioned
- Focus on achievements and outcomes, not just duties

Return ONLY the improved CV JSON with no explanations or markdown.`

  const userPrompt = `Merge the following answers into the CV JSON structure:

CURRENT CV:
${JSON.stringify(cv, null, 2)}

USER ANSWERS:
${JSON.stringify(answers, null, 2)}

Instructions:
- Preserve existing CV structure and data
- Integrate answer content into appropriate sections
- Enhance descriptions with quantified metrics from answers
- Maintain ISO date format (YYYY-MM)
- Focus on measurable achievements and impact

Return ONLY the enhanced CV JSON.`

  try {
    const result = await callOpenAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], 3500)

    const improvedCV = JSON.parse(result)
    console.log('CV improved successfully')
    res.json(improvedCV)
  } catch (error) {
    console.error('Improve CV error:', error)
    res.status(500).json({
      error: 'Failed to improve CV',
      message: error.message
    })
  }
}))

// Score CV endpoint
app.post('/api/ai/score', asyncHandler(async (req, res) => {
  const validation = scoreSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      error: 'Invalid input',
      details: validation.error.errors
    })
  }

  const { cv } = validation.data

  const systemPrompt = `You are a professional CV evaluation expert. Analyze and score a CV comprehensively.

SCORING CRITERIA:
- Content completeness and relevance (0-100)
- Professional presentation and formatting (0-100) 
- Impact demonstration with quantified results (0-100)
- Skills clarity and market relevance (0-100)
- Career progression and growth (0-100)
- ATS optimization and keyword usage (0-100)

ANALYSIS REQUIREMENTS:
1. Calculate overall score (0-100) as weighted average
2. Identify 3-5 key strengths 
3. Identify 3-5 key weaknesses
4. Provide 3-5 specific, actionable suggestions

RESPONSE FORMAT - Return ONLY this JSON structure:
{
  "score": 85,
  "strengths": [
    "Strong quantified achievements in experience section",
    "Comprehensive technical skills coverage",
    "Clear career progression trajectory"
  ],
  "weaknesses": [
    "Missing professional summary",
    "Some experience bullets lack impact metrics",
    "Limited industry-specific keywords"
  ],
  "suggestions": [
    "Add a compelling professional summary highlighting key value proposition",
    "Quantify all achievements with specific numbers, percentages, or dollar amounts",
    "Include more industry-relevant technical keywords for ATS optimization"
  ]
}

Return ONLY valid JSON with no additional text or explanations.`

  const userPrompt = `Analyze this CV and provide a comprehensive evaluation:

CV DATA:
${JSON.stringify(cv, null, 2)}

Return ONLY the JSON response with score, strengths, weaknesses, and suggestions as specified in the system prompt.`

  try {
    const result = await callOpenAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], 2000)

    const scoreData = JSON.parse(result)
    console.log(`CV scored: ${scoreData.overall}%`)
    res.json(scoreData)
  } catch (error) {
    console.error('Score CV error:', error)
    res.status(500).json({
      error: 'Failed to score CV',
      message: error.message
    })
  }
}))

// Generate cover letter endpoint
app.post('/api/ai/coverletter', asyncHandler(async (req, res) => {
  const validation = coverLetterSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      error: 'Invalid input',
      details: validation.error.errors
    })
  }

  const { cv, roleHint } = validation.data

  const systemPrompt = `You are a professional cover letter writer. Create compelling, personalized cover letters based on CV information.

Cover letter guidelines:
1. Professional yet engaging tone
2. Highlight 2-3 most relevant achievements from the CV
3. Show genuine interest in the role/company
4. Demonstrate value proposition clearly
5. Call to action in closing
6. Keep to 3-4 paragraphs, ~300-400 words
7. Avoid generic phrases and clichés

Structure:
- Opening: Enthusiasm and position interest
- Body: Relevant achievements and skills alignment
- Closing: Value proposition and next steps

Return JSON with the cover letter content and metadata.`

  const userPrompt = `Create a professional cover letter based on this CV:

CV Information:
${JSON.stringify(cv, null, 2)}

${roleHint ? `Target Role/Company Context: ${roleHint}` : 'Create a versatile cover letter suitable for roles in their field.'}

Generate a compelling cover letter that highlights their strongest qualifications and achievements.

Return in this JSON format:
{
  "coverLetter": "Full cover letter text here...",
  "wordCount": 350,
  "tone": "professional",
  "keyHighlights": ["Achievement 1", "Achievement 2", "Skill 1"]
}`

  try {
    const result = await callOpenAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], 2500)

    const coverLetterData = JSON.parse(result)
    console.log('Cover letter generated successfully')
    res.json(coverLetterData)
  } catch (error) {
    console.error('Generate cover letter error:', error)
    res.status(500).json({
      error: 'Failed to generate cover letter',
      message: error.message
    })
  }
}))

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
})

// Catch-all for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  })
})

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error)

  // Validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.message
    })
  }

  // JSON parsing errors
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Invalid JSON in request body'
    })
  }

  // Rate limit errors
  if (error.status === 429) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests, please try again later'
    })
  }

  // Default server error
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  })
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully')
  process.exit(0)
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`)
  console.log(`🤖 OpenAI Model: ${process.env.OPENAI_MODEL || 'gpt-4o-mini'}`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)

  // Validate required environment variables
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  WARNING: OPENAI_API_KEY not set')
  }
})

module.exports = app
