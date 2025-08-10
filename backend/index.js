require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const dataStorage = require('./utils/dataStorage')
const multer = require('multer')
const pdfParse = require('pdf-parse')
const mammoth = require('mammoth')
const { z } = require('zod')

// Debug mode configuration
let DEBUG = process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development'
let CURRENT_AI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

// Log storage for admin panel
let logHistory = []
const addToLogHistory = (level, message) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message: typeof message === 'object' ? JSON.stringify(message, null, 2) : String(message)
  }
  logHistory = [...logHistory.slice(-49), logEntry] // Son 50 log tut
}

const debugLog = (...args) => {
  const message = args.join(' ')
  if (DEBUG) {
    console.log('[DEBUG]', new Date().toISOString(), ...args)
    addToLogHistory('DEBUG', message)
  }
}
const infoLog = (...args) => {
  const message = args.join(' ')
  console.log('[INFO]', new Date().toISOString(), ...args)
  addToLogHistory('INFO', message)
}
const errorLog = (...args) => {
  const message = args.join(' ')
  console.error('[ERROR]', new Date().toISOString(), ...args)
  addToLogHistory('ERROR', message)
}

const app = express()
const PORT = process.env.PORT || 4000

// Middleware setup
app.use(helmet())

// CORS configuration for multiple origins
const allowedOrigins = [
  'http://localhost:3000', // Local development
  'https://cvbuilderwithai.vercel.app', // Production frontend
  process.env.FRONTEND_URL // Additional environment-specific URL
].filter(Boolean) // Remove any undefined values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true)

    if (allowedOrigins.includes(origin)) {
      return callback(null, true)
    } else {
      console.warn(`CORS blocked origin: ${origin}`)
      return callback(new Error('Not allowed by CORS'), false)
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
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

// Multer setup for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, DOC, and TXT files are allowed.'), false)
    }
  }
})

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Logging middleware
app.use((req, res, next) => {
  // Skip logging for admin/internal endpoints to prevent log spam
  const skipPaths = ['/api/logs', '/api/config', '/api/health']
  const shouldSkip = skipPaths.includes(req.path)

  if (DEBUG && !shouldSkip) {
    debugLog(`${req.method} ${req.path}`, req.query, req.body ? Object.keys(req.body) : 'no-body')
  } else if (!DEBUG && !shouldSkip) {
    // Only log important endpoints in production
    if (['/api/upload-parse', '/api/ai/questions', '/api/ai/score', '/api/ai/coverletter'].includes(req.path)) {
      infoLog(`${req.method} ${req.path}`)
    }
  }
  next()
})

// Validation schemas
const parseSchema = z.object({
  rawText: z.string().optional(),
  template: z.object({}).optional()
})

const questionsSchema = z.object({
  cvData: z.any(), // Accept any object structure for CV data
  appLanguage: z.string().optional(),
  askedQuestions: z.array(z.any()).optional(),
  maxQuestions: z.number().int().min(1).max(10).optional(),
  sessionId: z.string().nullable().optional()
})

const improveSchema = z.object({
  cv: z.object({}),
  answers: z.object({})
})

const scoreSchema = z.object({
  cvData: z.any(), // Accept any object structure for CV data
  appLanguage: z.string().optional()
})

const coverLetterSchema = z.object({
  cvData: z.any(),
  appLanguage: z.string().optional(),
  sessionId: z.string().nullable().optional(),
  roleHint: z.string().optional(),
  companyName: z.string().optional(),
  positionName: z.string().optional()
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
        model: CURRENT_AI_MODEL,
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
    errorLog('OpenAI API call failed:', error)
    throw error
  }
}

// Error handling middleware
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

// File extraction utility
async function extractTextFromFile(file) {
  try {
    const { buffer, mimetype, originalname } = file
    debugLog(`Extracting text from file: ${originalname}, type: ${mimetype}`)

    switch (mimetype) {
      case 'application/pdf':
        const pdfData = await pdfParse(buffer)
        debugLog(`PDF text extracted: ${pdfData.text.length} characters`)
        return pdfData.text

      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        const docxResult = await mammoth.extractRawText({ buffer })
        debugLog(`DOCX text extracted: ${docxResult.value.length} characters`)
        return docxResult.value

      case 'application/msword':
        // For older .doc files, mammoth can still try
        const docResult = await mammoth.extractRawText({ buffer })
        debugLog(`DOC text extracted: ${docResult.value.length} characters`)
        return docResult.value

      case 'text/plain':
        const txtContent = buffer.toString('utf8')
        debugLog(`TXT text extracted: ${txtContent.length} characters`)
        return txtContent

      default:
        throw new Error(`Unsupported file type: ${mimetype}`)
    }
  } catch (error) {
    console.error('Error extracting text from file:', error)
    throw new Error(`Failed to extract text from file: ${error.message}`)
  }
}

// API Routes

// File upload and parse endpoint 
app.post('/api/upload-parse', upload.single('cv'), asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please upload a CV file (PDF, DOCX, DOC, or TXT)'
      })
    }

    infoLog(`File upload received: ${req.file.originalname}, size: ${req.file.size} bytes`)

    // Extract text from the uploaded file
    const extractedText = await extractTextFromFile(req.file)

    if (!extractedText || extractedText.trim() === '') {
      return res.status(400).json({
        error: 'No text extracted',
        message: 'Could not extract readable text from the uploaded file'
      })
    }

    debugLog(`Text extracted successfully: ${extractedText.length} characters`)

    // Parse the extracted text using AI
    const systemPrompt = `You are a CV/Resume parser. Extract information from the provided CV text and return it in the specified JSON format. Pay special attention to Turkish characters and names.

Return a JSON object with these exact fields:
{
  "personalInfo": {
    "name": "Full name from CV",
    "email": "Email address", 
    "phone": "Phone number",
    "location": "City/Country"
  },
  "summary": "Professional summary or objective",
  "experience": [
    {
      "position": "Job title",
      "company": "Company name", 
      "location": "Work location",
      "startDate": "YYYY-MM or YYYY",
      "endDate": "YYYY-MM or YYYY or 'Present'",
      "description": "Job responsibilities and achievements"
    }
  ],
  "education": [
    {
      "degree": "Degree type and field",
      "institution": "School/University name",
      "location": "School location", 
      "startDate": "YYYY-MM or YYYY",
      "endDate": "YYYY-MM or YYYY",
      "gpa": "GPA if mentioned"
    }
  ],
  "skills": ["skill1", "skill2", "skill3"],
  "projects": [
    {
      "name": "Project name",
      "description": "Project description",
      "technologies": ["tech1", "tech2"],
      "url": "Project URL if available"
    }
  ],
  "links": [
    {
      "type": "LinkedIn/GitHub/Portfolio/etc",
      "url": "URL"
    }
  ],
  "certificates": [
    {
      "name": "Certificate name",
      "issuer": "Issuing organization",
      "date": "YYYY-MM or YYYY",
      "url": "Certificate URL if available"
    }
  ],
  "languages": [
    {
      "language": "Language name",
      "proficiency": "Native/Fluent/Advanced/Intermediate/Basic"
    }
  ],
  "references": [
    {
      "name": "Reference name",
      "position": "Their position",
      "company": "Their company",
      "email": "Contact email",
      "phone": "Contact phone"
    }
  ]
}

IMPORTANT: 
- Extract information accurately, especially names with Turkish characters (ğ, ü, ş, ı, ö, ç)
- If a field is not found, use empty string "" for strings and empty array [] for arrays
- Return only valid JSON, no additional text or formatting`

    const userPrompt = `Please parse this CV and extract the information:\n\n${extractedText}`

    const result = await callOpenAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], 3000)

    const parsedData = JSON.parse(result)
    infoLog('CV parsed successfully from uploaded file')
    debugLog('Extracted name:', parsedData.personalInfo?.name)
    res.json(parsedData)
  } catch (error) {
    errorLog('File upload and parse error:', error)
    res.status(500).json({
      error: 'Failed to process uploaded file',
      message: error.message
    })
  }
}))

// Extract raw text endpoint (alias for parse)
app.post('/api/extract-raw', asyncHandler(async (req, res) => {
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
    console.log('CV parsed successfully via extract-raw endpoint')
    res.json(parsedData)
  } catch (error) {
    console.error('Parse CV error (extract-raw):', error)
    res.status(500).json({
      error: 'Failed to parse CV',
      message: error.message
    })
  }
}))

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
  debugLog('Questions endpoint - Request body:', JSON.stringify(req.body, null, 2))

  const validation = questionsSchema.safeParse(req.body)
  if (!validation.success) {
    debugLog('Questions endpoint - Validation failed:', validation.error.errors)
    return res.status(400).json({
      error: 'Invalid input',
      details: validation.error.errors
    })
  }

  const { cvData, maxQuestions = 4, appLanguage = 'en' } = validation.data
  debugLog('Questions endpoint - Extracted cvData:', cvData ? 'EXISTS' : 'NULL')
  debugLog('Questions endpoint - cvData keys:', cvData ? Object.keys(cvData) : 'N/A')
  debugLog('Questions endpoint - App Language:', appLanguage)

  // Check if cvData is null or empty
  if (!cvData || typeof cvData !== 'object' || cvData === null || Object.keys(cvData).length === 0) {
    debugLog('Questions endpoint - CV data check failed')
    debugLog('Questions endpoint - cvData type:', typeof cvData)
    debugLog('Questions endpoint - cvData value:', cvData)
    return res.status(400).json({
      error: 'CV data is required',
      message: 'Please provide valid CV data for question generation'
    })
  }

  const systemPrompt = `You are an expert CV optimization consultant. Your mission: identify the HIGHEST-IMPACT gaps in this CV and generate strategic questions to fill them.

${appLanguage === 'tr' ?
      'IMPORTANT: Respond in Turkish (Türkçe). Generate all questions and text in Turkish language.' :
      'IMPORTANT: Respond in English.'}

ANALYSIS PRIORITY (focus on these KEY areas):
1. QUANTIFIABLE ACHIEVEMENTS - Missing numbers, metrics, business impact
2. TECHNICAL PROFICIENCY - Skill levels, certifications, tools mastery
3. LEADERSHIP IMPACT - Team management, project leadership, decision-making
4. CAREER PROGRESSION - Growth trajectory, increasing responsibilities
5. INDUSTRY RELEVANCE - Sector-specific keywords, domain expertise

QUESTION STRATEGY:
- Ask for SPECIFIC metrics (%, $, numbers, timeframes)  
- Target gaps that recruiters notice immediately
- Focus on areas where candidates typically undervalue themselves
- Prioritize recent/relevant experience over old positions
- Avoid generic questions - be laser-focused on their profile
- For obvious typos or common company names, suggest corrections with multiple choice options
- Sometimes provide multiple choice answers to speed up interaction

JSON FORMAT (exactly ${maxQuestions} questions):
{
  "questions": [
    {
      "id": "q1", 
      "question": "Specific, actionable question targeting a critical gap",
                        "category": "achievements|technical|leadership|growth|industry|typo_correction",
      "hint": "Clear guidance on what type of answer will maximize CV impact",
      "isMultipleChoice": false,
      "choices": ["Option 1", "Option 2", "Option 3", "Bunların dışında"]
    }
  ]
}

MULTIPLE CHOICE & TYPO CORRECTION STRATEGY:
            - ACTIVELY look for obvious typos in company names, technologies, locations, skills
            - MANDATORY typo check for: company names (Apple, Google, Microsoft, Amazon, etc.), technologies (JavaScript, Python, React, etc.), cities (İstanbul, Ankara, etc.)
            - Examples: "Aple" → ["Apple", "Custom input"], "Gogle" → ["Google", "Custom input"], "javasptit" → ["JavaScript", "Custom input"], "reactjs" → ["React", "Custom input"]
            - ANY suspicious spelling should trigger a correction question
- For time-based questions: ["2024", "2023", "Custom input"] 
- For yes/no questions: ["Evet", "Hayır"] or ["Yes", "No"]
- For levels: ["Beginner", "Advanced", "Custom input"]
- MAX 2 predefined options + always include "Custom input" as third option
- Use isMultipleChoice: true and provide exactly 2-3 options
- ONLY include "choices" array when isMultipleChoice is true
- Prioritize typo corrections - if you see ANY suspicious spellings, create correction questions

CRITICAL: Base questions on actual CV content analysis, not generic templates.`

  const userPrompt = `Based on this CV, generate ${maxQuestions} targeted questions to help improve their profile:

CV Data: ${JSON.stringify(cvData, null, 2)}

Generate questions that will help uncover missing achievements, quantify impact, and highlight their unique value proposition.`

  try {
    const result = await callOpenAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], 1500)

    const questionsData = JSON.parse(result)
    infoLog(`Generated ${maxQuestions} questions successfully`)
    res.json(questionsData)
  } catch (error) {
    errorLog('Generate questions error:', error)
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

  const { cvData, appLanguage = 'en' } = validation.data

  // Check if cvData is null or empty
  if (!cvData || typeof cvData !== 'object' || cvData === null || Object.keys(cvData).length === 0) {
    console.log('Score endpoint - CV data check failed')
    console.log('Score endpoint - cvData type:', typeof cvData)
    console.log('Score endpoint - cvData value:', cvData)
    return res.status(400).json({
      error: 'CV data is required',
      message: 'Please provide valid CV data for scoring'
    })
  }

  const systemPrompt = `You are a senior recruiting manager and CV optimization expert. Evaluate this CV as if you're reviewing it for a competitive role.

${appLanguage === 'tr' ?
      'IMPORTANT: Respond in Turkish (Türkçe). All feedback should be in Turkish language.' :
      'IMPORTANT: Respond in English.'}

EVALUATION CRITERIA (weighted scoring):
1. IMPACT & ACHIEVEMENTS (30%) - Quantified results, business impact, measurable outcomes
2. TECHNICAL COMPETENCY (25%) - Skill relevance, proficiency levels, certifications
3. CAREER PROGRESSION (20%) - Growth trajectory, increasing responsibilities, leadership
4. MARKET RELEVANCE (15%) - Industry keywords, current technologies, sector alignment  
5. PRESENTATION QUALITY (10%) - Structure, clarity, professional formatting

SCORING APPROACH:
- 90-100: Outstanding candidate, immediate interview
- 80-89: Strong candidate, high potential
- 70-79: Good candidate, some improvements needed
- 60-69: Adequate candidate, significant gaps to address
- Below 60: Requires major restructuring

ANALYSIS FOCUS (prioritize improvement opportunities):
- What are the MOST CRITICAL gaps that could cause rejection?
- Which missing achievements/metrics would have highest impact?
- What specific improvements would boost this CV from good to exceptional?
- Which areas need immediate attention to compete in today's market?
- What quantifiable results are completely missing?

FEEDBACK PRIORITY:
1. Focus primarily on actionable improvements (60% of analysis)
2. Identify specific weaknesses with clear solutions (30% of analysis)  
3. Acknowledge strengths briefly (10% of analysis)

JSON RESPONSE FORMAT ONLY:
{
  "overall": 85,
  "strengths": [
    "Güçlü teknik beceri çeşitliliği",
    "Pratik proje deneyimi"
  ],
  "weaknesses": [
    "Sayısal başarılar ve iş etkisi metrikleri eksik",
    "Proje sonuçları ve somut çıktılar belirtilmemiş", 
    "Liderlik ve ekip çalışması örnekleri yok",
    "Kariyer gelişimi ve artan sorumluluklar vurgulanmamış"
  ],
  "suggestions": [
    "Her proje için spesifik rakamlar ekleyin: '%X performans artışı' veya '$X değerinde proje yönettim'",
    "Yönettiğiniz ekip büyüklüğü ve işbirliği kapsamını proje açıklamalarına dahil edin",
    "Ödüller, takdirler veya öne çıkan başarılarınızı vurgulayın",
    "Teknolojilerin iş süreçlerine katkısını somut örneklerle açıklayın"
  ]
}

Return ONLY valid JSON with no additional text or explanations.`

  const userPrompt = `Analyze this CV and provide a comprehensive evaluation:

CV DATA:
${JSON.stringify(cvData, null, 2)}

Return ONLY the JSON response with score, strengths, weaknesses, and suggestions as specified in the system prompt.`

  try {
    const result = await callOpenAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], 2000)

    const scoreData = JSON.parse(result)
    infoLog(`CV scored: ${scoreData.overall}%`)
    res.json(scoreData)
  } catch (error) {
    errorLog('Score CV error:', error)
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

  const { cvData, appLanguage = 'en', sessionId, roleHint, companyName, positionName } = validation.data

  const systemPrompt = `You are a professional cover letter writer. Create compelling, personalized cover letters based on CV information.

${appLanguage === 'tr' ?
      'IMPORTANT: Respond in Turkish (Türkçe). Generate the cover letter in Turkish language.' :
      'IMPORTANT: Respond in English.'}

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
${JSON.stringify(cvData, null, 2)}

${companyName || positionName ?
      `Target Application Details:
  ${companyName ? `Company: ${companyName}` : ''}
  ${positionName ? `Position: ${positionName}` : ''}
  
  Please customize the cover letter for this specific company and role.` :
      'Create a versatile cover letter suitable for roles in their field.'
    }

${roleHint ? `Additional Context: ${roleHint}` : ''}

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

    // Save session data with cover letter
    try {
      await dataStorage.logActivity('cover_letter_generated', {
        sessionId,
        hasCompanyName: !!companyName,
        hasPositionName: !!positionName,
        coverLetterLength: coverLetterData.coverLetter ? coverLetterData.coverLetter.length : 0
      }, req);
    } catch (storageError) {
      errorLog('Failed to log cover letter generation:', storageError);
    }

    infoLog('Cover letter generated successfully')
    res.json(coverLetterData)
  } catch (error) {
    errorLog('Generate cover letter error:', error)
    res.status(500).json({
      error: 'Failed to generate cover letter',
      message: error.message
    })
  }
}))

// Generate cover letter PDF endpoint
app.post('/api/ai/coverletter-pdf', asyncHandler(async (req, res) => {
  const validation = coverLetterSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      error: 'Invalid input',
      details: validation.error.errors
    })
  }

  const { cvData, appLanguage = 'en', sessionId, roleHint, companyName, positionName } = validation.data

  try {
    // First get the cover letter content
    const systemPrompt = `You are a professional cover letter writer. Create compelling, personalized cover letters based on CV information.

${appLanguage === 'tr' ?
        'IMPORTANT: Respond in Turkish (Türkçe). Generate the cover letter in Turkish language.' :
        'IMPORTANT: Respond in English.'}

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
${JSON.stringify(cvData, null, 2)}

${companyName || positionName ?
        `Target Application Details:
  ${companyName ? `Company: ${companyName}` : ''}
  ${positionName ? `Position: ${positionName}` : ''}
  
  Please customize the cover letter for this specific company and role.` :
        'Create a versatile cover letter suitable for roles in their field.'
      }

${roleHint ? `Additional Context: ${roleHint}` : ''}

Generate a compelling cover letter that highlights their strongest qualifications and achievements.

Return in this JSON format:
{
  "coverLetter": "Full cover letter text here...",
  "wordCount": 350,
  "tone": "professional",
  "keyHighlights": ["Achievement 1", "Achievement 2", "Skill 1"]
}`

    const result = await callOpenAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], 2500)

    const coverLetterData = JSON.parse(result)
    const coverText = coverLetterData.coverLetter || 'Ön yazı oluşturulamadı'

    // Save finalized data with cover letter
    try {
      const sessionId = req.body.sessionId || `session_${Date.now()}`;
      await dataStorage.saveFinalizedData(sessionId, cvData, coverText, { coverLetterPdf: true }, req);
    } catch (storageError) {
      errorLog('Failed to save finalized data with cover letter:', storageError);
    }

    // Try to use backend PDF service
    try {
      const pdfService = require('./services/pdfService')
      const pdfBuffer = await pdfService.createCoverLetterPdf(coverText)

      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', 'attachment; filename="cover-letter.pdf"')
      res.send(pdfBuffer)

      infoLog('Cover letter PDF generated successfully using backend service')
    } catch (pdfError) {
      errorLog('Backend cover letter PDF service failed:', pdfError)
      // Fallback to simple text response
      res.json({
        coverLetter: coverText,
        message: 'PDF generation failed, returning text only',
        error: pdfError.message
      })
    }
  } catch (error) {
    errorLog('Generate cover letter PDF error:', error)
    res.status(500).json({
      error: 'Failed to generate cover letter PDF',
      message: error.message
    })
  }
}))

// CV PDF creation endpoint - using backend PDF service
app.post('/api/finalize-and-create-pdf', asyncHandler(async (req, res) => {
  try {
    infoLog('PDF generation requested using backend PDF service')

    const { cvData, cvLanguage = 'tr', sessionId } = req.body

    if (!cvData) {
      return res.status(400).json({
        error: 'CV data is required',
        message: 'Please provide CV data for PDF generation'
      })
    }

    // Check if we have the PDF service available
    try {
      const pdfService = require('./services/pdfService')

      // Transform frontend data format to backend format
      const transformedCvData = {
        ...cvData,
        experience: cvData.experience?.map(exp => ({
          ...exp,
          title: exp.position || exp.title,
          location: exp.location === 'undened' || exp.location === 'undefined' ? '' : exp.location || '',
          date: exp.date || (exp.startDate && exp.endDate ? `${exp.startDate} - ${exp.endDate}` : exp.start && exp.end ? `${exp.start} - ${exp.end}` : ''),
          description: exp.description || (exp.bullets ? exp.bullets.join('\n') : '')
        })) || [],
        education: cvData.education?.map(edu => ({
          ...edu,
          location: edu.location === 'undened' || edu.location === 'undefined' ? '' : edu.location || '',
          date: edu.date || (edu.startDate && edu.endDate ? `${edu.startDate} - ${edu.endDate}` : edu.start && edu.end ? `${edu.start} - ${edu.end}` : '')
        })) || []
      }

      debugLog('Transformed CV data for backend PDF:', transformedCvData)
      const pdfBuffer = await pdfService.createPdf(transformedCvData, cvLanguage)

      // Save finalized data
      try {
        const sessionId = req.body.sessionId || `session_${Date.now()}`;
        await dataStorage.saveFinalizedData(sessionId, {
          cvData: transformedCvData,
          cvLanguage,
          timestamp: new Date().toISOString()
        });
      } catch (storageError) {
        errorLog('Failed to save finalized data:', storageError);
      }

      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', 'attachment; filename="cv.pdf"')
      res.send(pdfBuffer)

      infoLog('PDF generated successfully using backend service')
    } catch (pdfError) {
      errorLog('Backend PDF service failed:', pdfError)

      // Fallback to frontend generation
      res.json({
        success: true,
        message: 'Backend PDF failed, frontend should handle generation',
        cvData: cvData,
        generateOnFrontend: true,
        fallbackReason: pdfError.message
      })
    }
  } catch (error) {
    errorLog('PDF generation error:', error)
    res.status(500).json({
      error: 'Failed to generate PDF',
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

// === CONFIG ENDPOINTS ===
// Debug mode toggle endpoint
app.post('/api/config/debug', asyncHandler(async (req, res) => {
  try {
    const { debug } = req.body

    if (typeof debug !== 'boolean') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'debug must be a boolean value'
      })
    }

    // Update global DEBUG variable
    DEBUG = debug

    infoLog('Debug mode updated via API:', DEBUG ? 'ENABLED' : 'DISABLED')

    res.json({
      success: true,
      debug: DEBUG,
      message: `Debug mode ${DEBUG ? 'enabled' : 'disabled'}`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    errorLog('Failed to update debug mode:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update debug mode'
    })
  }
}))

// AI model change endpoint
app.post('/api/config/ai-model', asyncHandler(async (req, res) => {
  try {
    const { model } = req.body

    const validModels = ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo']
    if (!validModels.includes(model)) {
      return res.status(400).json({
        error: 'Invalid model',
        message: `Model must be one of: ${validModels.join(', ')}`,
        validModels
      })
    }

    // Update global AI model variable
    CURRENT_AI_MODEL = model

    infoLog('AI model updated via API:', CURRENT_AI_MODEL)

    res.json({
      success: true,
      aiModel: CURRENT_AI_MODEL,
      message: `AI model changed to ${CURRENT_AI_MODEL}`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    errorLog('Failed to update AI model:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update AI model'
    })
  }
}))

// Get current config endpoint
app.get('/api/config', asyncHandler(async (req, res) => {
  res.json({
    debug: DEBUG,
    aiModel: CURRENT_AI_MODEL,
    nodeEnv: process.env.NODE_ENV,
    version: '1.2508.091851',
    timestamp: new Date().toISOString()
  })
}))

// Get backend logs endpoint
app.get('/api/logs', asyncHandler(async (req, res) => {
  res.json({
    logs: logHistory,
    count: logHistory.length,
    timestamp: new Date().toISOString()
  })
}))

// Clear backend logs endpoint
app.delete('/api/logs', asyncHandler(async (req, res) => {
  logHistory = []
  infoLog('Backend logs cleared via API')
  res.json({
    success: true,
    message: 'Backend logs cleared',
    timestamp: new Date().toISOString()
  })
}))

// Feedback endpoint
app.post('/api/feedback', asyncHandler(async (req, res) => {
  try {
    const { name, email, message, sessionId, language, theme } = req.body

    // Validate required fields
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        error: 'Message is required',
        message: 'Please provide a feedback message'
      })
    }

    // Optional email validation if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
        message: 'Please provide a valid email address'
      })
    }

    // Save feedback to data storage
    const feedbackData = {
      name: name || 'Anonymous',
      email: email || '',
      message: message.trim(),
      sessionId: sessionId || 'unknown',
      language: language || 'en',
      theme: theme || 'light',
      timestamp: new Date().toISOString()
    }

    await dataStorage.saveFeedback(feedbackData)

    infoLog('Feedback received:', {
      name: feedbackData.name,
      email: feedbackData.email ? '***@***.***' : 'not provided',
      sessionId: feedbackData.sessionId,
      language: feedbackData.language,
      theme: feedbackData.theme
    })

    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    errorLog('Failed to submit feedback:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to submit feedback. Please try again later.'
    })
  }
}))

// Get data storage stats endpoint (for admin)
app.get('/api/admin/stats', asyncHandler(async (req, res) => {
  try {
    const stats = await dataStorage.getSessionStats();
    const finalizedFolders = await dataStorage.getFinalizedFolders();
    res.json({
      success: true,
      stats,
      finalizedFolders,
      serverInfo: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        platform: process.platform,
        nodeVersion: process.version
      }
    });
  } catch (error) {
    errorLog('Failed to get admin stats:', error);
    res.status(500).json({
      error: 'Failed to retrieve stats',
      message: error.message
    });
  }
}))

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
  infoLog(`🚀 Server running on port ${PORT}`)
  infoLog(`📍 Health check: http://localhost:${PORT}/api/health`)
  infoLog(`🤖 OpenAI Model: ${process.env.OPENAI_MODEL || 'gpt-4o-mini'}`)
  infoLog(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
  infoLog(`🔍 Debug mode: ${DEBUG ? 'ENABLED' : 'DISABLED'}`)

  // Validate required environment variables
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  WARNING: OPENAI_API_KEY not set')
  }
})

module.exports = app
