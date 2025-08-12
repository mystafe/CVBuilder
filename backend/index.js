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
const fs = require('fs')
const path = require('path')
const web_search = require('./services/webSearch'); // Added for web search functionality

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
    // Allow requests with no origin or same-origin
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    // Fallback: allow same-host different port (Render/Vercel proxy)
    try {
      const u = new URL(origin)
      const host = u.hostname
      const isRender = host.includes('onrender.com') || host.includes('vercel.app')
      if (isRender) return callback(null, true)
    } catch { }
    console.warn(`CORS blocked origin: ${origin}`)
    return callback(new Error('Not allowed by CORS'), false)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))

// Rate limiting - global: 60 requests per 5 minutes
const limiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
})
app.use(limiter)

// Additional API limiter: 20 requests per minute on /api/*
app.use('/api', rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many API requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
}))

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
// Tighten body limit per requirements
app.use(express.json({ limit: '2mb' }))
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

const skillQuestionSchema = z.object({
  cvData: z.any(),
  appLanguage: z.string().optional().default('en')
})

const skillAssessmentSchema = z.object({
  cvData: z.any(),
  appLanguage: z.string().optional().default('en')
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

// Safe JSON-only OpenAI call helper
async function callJsonPrompt({ system, user, maxTokens = 2000 }) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: CURRENT_AI_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        max_tokens: maxTokens,
        temperature: 0,
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || '{}'
    return JSON.parse(content)
  } catch (error) {
    errorLog('callJsonPrompt failed:', error.message)
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

// File text extraction by path (supports .pdf, .docx, .txt)
async function extractTextFromFilePath(filePath) {
  try {
    const base = path.join(process.cwd(), 'data')
    // sanitize path: no absolute outside base, no '..'
    if (!filePath || filePath.includes('..')) {
      throw new Error('Invalid file path')
    }
    const absolutePath = path.join(base, filePath)
    const resolved = path.resolve(absolutePath)
    if (!resolved.startsWith(base)) {
      throw new Error('Access outside data directory is not allowed')
    }
    if (!fs.existsSync(resolved)) {
      throw new Error(`File not found: ${absolutePath}`)
    }
    const ext = path.extname(resolved).toLowerCase()
    const buffer = fs.readFileSync(resolved)
    if (ext === '.pdf') {
      const out = await pdfParse(buffer)
      return out.text || ''
    }
    if (ext === '.docx' || ext === '.doc') {
      const out = await mammoth.extractRawText({ buffer })
      return out.value || ''
    }
    if (ext === '.txt') {
      return buffer.toString('utf8')
    }
    throw new Error(`Unsupported file extension: ${ext}`)
  } catch (err) {
    errorLog('extractTextFromFilePath error:', err.message)
    throw err
  }
}

// === Unified CV Zod schema for Step 2 APIs ===
const CvPersonalSchema = z.object({
  fullName: z.string().optional().default(''),
  email: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  location: z.string().optional().default(''),
})

const CvExperienceSchema = z.object({
  title: z.string().optional().default(''),
  company: z.string().optional().default(''),
  location: z.string().optional().default(''),
  startDate: z.string().optional().default(''),
  endDate: z.string().optional().default(''),
  current: z.boolean().optional().default(false),
  bullets: z.array(z.string()).optional().default([]),
})

const CvEducationSchema = z.object({
  school: z.string().optional().default(''),
  degree: z.string().optional().default(''),
  field: z.string().optional().default(''),
  startDate: z.string().optional().default(''),
  endDate: z.string().optional().default(''),
})

const CvSkillSchema = z.object({
  key: z.string().optional(),
  name: z.string().optional().default(''),
  level: z.string().optional().default(''),
})

const CvCertificationSchema = z.object({
  name: z.string().optional().default(''),
  issuer: z.string().optional().default(''),
  year: z.string().optional().default(''),
})

const CvProjectSchema = z.object({
  name: z.string().optional().default(''),
  summary: z.string().optional().default(''),
  tech: z.array(z.string()).optional().default([]),
})

const CvLanguageSchema = z.object({
  name: z.string().optional().default(''),
  level: z.string().optional().default(''),
})

const CvTargetSchema = z.object({
  role: z.string().optional().default(''),
  seniority: z.string().optional().default(''),
  sector: z.string().optional().default(''),
})

const UnifiedCvSchema = z.object({
  personal: CvPersonalSchema.default({}),
  summary: z.string().optional().default(''),
  experience: z.array(CvExperienceSchema).optional().default([]),
  education: z.array(CvEducationSchema).optional().default([]),
  skills: z.array(CvSkillSchema).optional().default([]),
  certifications: z.array(CvCertificationSchema).optional().default([]),
  projects: z.array(CvProjectSchema).optional().default([]),
  languages: z.array(CvLanguageSchema).optional().default([]),
  target: CvTargetSchema.optional().default({}),
})

function safeParseCv(obj) {
  const parsed = UnifiedCvSchema.safeParse(obj || {})
  if (!parsed.success) return { success: false, error: parsed.error }
  return { success: true, data: parsed.data }
}

function mergeCv(base, patch) {
  const b = base || {}
  const p = patch || {}
  const merged = {
    personal: { ...(b.personal || {}), ...(p.personal || {}) },
    summary: p.summary ?? b.summary ?? '',
    // Arrays overwrite entirely
    experience: Array.isArray(p.experience) ? p.experience : (b.experience || []),
    education: Array.isArray(p.education) ? p.education : (b.education || []),
    skills: Array.isArray(p.skills) ? p.skills : (b.skills || []),
    certifications: Array.isArray(p.certifications) ? p.certifications : (b.certifications || []),
    projects: Array.isArray(p.projects) ? p.projects : (b.projects || []),
    languages: Array.isArray(p.languages) ? p.languages : (b.languages || []),
    target: { ...(b.target || {}), ...(p.target || {}) },
  }
  return UnifiedCvSchema.parse(merged)
}

// Helpers to read prompt templates
function readPrompt(fileName) {
  const promptPath = path.join(__dirname, 'prompts', fileName)
  return fs.readFileSync(promptPath, 'utf8')
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

// === STEP 2 APIs ===
// POST /api/parse -> normalize raw text (or filePath) into unified CV JSON
const parseInputSchema = z.object({
  text: z.string().optional(),
  filePath: z.string().optional(),
})

app.post('/api/parse', asyncHandler(async (req, res) => {
  const validation = parseInputSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({ error: 'Invalid input', details: validation.error.errors })
  }
  let { text, filePath } = validation.data
  try {
    if (filePath && !text) {
      const extracted = await extractTextFromFilePath(filePath)
      text = extracted || ''
    }
    const raw = (text || '').slice(0, 15000)
    if (!raw.trim()) {
      const cv = UnifiedCvSchema.parse({})
      return res.json({ cv })
    }
    const system = readPrompt('normalize.md')
    const user = raw
    const json = await callJsonPrompt({ system, user, maxTokens: 3000 })
    const safe = safeParseCv(json)
    if (!safe.success) {
      return res.status(422).json({ error: 'Invalid CV JSON from model', details: safe.error.errors })
    }
    return res.json({ cv: safe.data })
  } catch (err) {
    return res.status(500).json({ error: 'parse_failed', message: err.message })
  }
}))

// POST /api/sector-questions { cv, target }
const sectorQuestionsInputSchema = z.object({
  cv: UnifiedCvSchema,
  target: CvTargetSchema,
})
const sectorQItemSchema = z.object({ id: z.string().min(1), question: z.string().min(5).max(200), key: z.enum(['metrics', 'scope', 'tools', 'impact', 'timeline', 'extras']) })
const sectorQuestionsOutputSchema = z.object({ questions: z.array(sectorQItemSchema).length(6) })

app.post('/api/sector-questions', asyncHandler(async (req, res) => {
  const validation = sectorQuestionsInputSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({ error: 'Invalid input', details: validation.error.errors })
  }
  try {
    const { cv, target } = validation.data
    const system = readPrompt('sectorQuestions.md')
    const user = JSON.stringify({ cv, target })
    const json = await callJsonPrompt({ system, user, maxTokens: 800 })
    const out = sectorQuestionsOutputSchema.safeParse(json)
    if (!out.success) {
      return res.status(422).json({ error: 'Invalid sector questions JSON from model', details: out.error.errors })
    }
    return res.json({ questions: out.data.questions })
  } catch (err) {
    return res.status(500).json({ error: 'sector_questions_failed', message: err.message })
  }
}))

// === Skill Assessment (generate + grade) ===
const inMemoryAnswerKey = new Map() // sessionId -> Map<id, correct>

const skillAssessGenerateInput = z.object({ cv: UnifiedCvSchema, target: CvTargetSchema })
const skillAssessItem = z.object({ id: z.string().min(1), topic: z.string().min(1), question: z.string().min(5), options: z.array(z.string()).length(4), answer: z.enum(['A', 'B', 'C', 'D']) })
const skillAssessGenerateOutput = z.object({ questions: z.array(skillAssessItem).min(6).max(8) })

app.post('/api/skill-assessment/generate', asyncHandler(async (req, res) => {
  const validation = skillAssessGenerateInput.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({ error: 'Invalid input', details: validation.error.errors })
  }
  try {
    const sessionId = req.header('X-Session-Id') || `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`
    res.setHeader('X-Session-Id', sessionId)
    const { cv, target } = validation.data
    const system = readPrompt('skillAssessment.md')
    const user = JSON.stringify({ cv, target })
    const json = await callJsonPrompt({ system, user, maxTokens: 1200 })
    const out = skillAssessGenerateOutput.safeParse(json)
    if (!out.success) {
      return res.status(422).json({ error: 'Invalid skill assessment JSON from model', details: out.error.errors })
    }
    const key = new Map()
    for (const q of out.data.questions) key.set(q.id, q.answer)
    inMemoryAnswerKey.set(sessionId, key)
    const questions = out.data.questions.map(({ answer, ...rest }) => rest)
    return res.json({ questions })
  } catch (err) {
    return res.status(500).json({ error: 'skill_assess_generate_failed', message: err.message })
  }
}))

const skillAssessGradeInput = z.object({ sessionId: z.string().min(1), answers: z.array(z.object({ id: z.string().min(1), choice: z.enum(['A', 'B', 'C', 'D']) })) })

app.post('/api/skill-assessment/grade', asyncHandler(async (req, res) => {
  const validation = skillAssessGradeInput.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({ error: 'Invalid input', details: validation.error.errors })
  }
  try {
    const { sessionId, answers } = validation.data
    const key = inMemoryAnswerKey.get(sessionId)
    if (!key) {
      return res.status(400).json({ error: 'session_not_found', message: 'Assessment session not found or expired' })
    }
    let correct = 0
    const breakdown = answers.map(a => {
      const isCorrect = key.get(a.id) === a.choice
      if (isCorrect) correct += 1
      return { id: a.id, correct: isCorrect }
    })
    const total = key.size
    const pct = total > 0 ? (correct / total) * 100 : 0
    return res.json({ score: { correct, total, pct }, breakdown })
  } catch (err) {
    return res.status(500).json({ error: 'skill_assess_grade_failed', message: err.message })
  }
}))

// === FINALIZE STAGE ENDPOINTS ===
const { renderPdfBuffer } = require('./src/renderers/pdf')
const { renderDocxBuffer } = require('./src/renderers/docx')

// POST /api/polish { cv, target } -> { cv, notes }
const polishInputSchema = z.object({ cv: UnifiedCvSchema, target: CvTargetSchema })
const polishOutputSchema = z.object({ cv: UnifiedCvSchema, notes: z.array(z.string()).max(10) })

app.post('/api/polish', asyncHandler(async (req, res) => {
  const validation = polishInputSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({ error: 'Invalid input', details: validation.error.errors })
  }
  try {
    const { cv, target } = validation.data
    const system = readPrompt('polish.md')
    const user = JSON.stringify({ cv, target })
    const json = await callJsonPrompt({ system, user, maxTokens: 1800 })
    const out = polishOutputSchema.safeParse(json)
    if (!out.success) {
      return res.status(422).json({ error: 'Invalid polish JSON from model', details: out.error.errors })
    }
    return res.json(out.data)
  } catch (err) {
    return res.status(500).json({ error: 'polish_failed', message: err.message })
  }
}))

// POST /api/ats/keywords { cv, jobText } -> { missing, suggested, score }
const atsInputSchema = z.object({ cv: UnifiedCvSchema, jobText: z.string().min(1) })
const atsOutputSchema = z.object({ missing: z.array(z.string()), suggested: z.array(z.string()), score: z.number().min(0).max(100) })

app.post('/api/ats/keywords', asyncHandler(async (req, res) => {
  const validation = atsInputSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({ error: 'Invalid input', details: validation.error.errors })
  }
  try {
    const { cv, jobText } = validation.data
    const system = readPrompt('atsKeywords.md')
    const user = JSON.stringify({ cv, jobText })
    const json = await callJsonPrompt({ system, user, maxTokens: 800 })
    const out = atsOutputSchema.safeParse(json)
    if (!out.success) {
      return res.status(422).json({ error: 'Invalid ATS JSON from model', details: out.error.errors })
    }
    return res.json(out.data)
  } catch (err) {
    return res.status(500).json({ error: 'ats_failed', message: err.message })
  }
}))

// POST /api/render/pdf { cv, template } -> { filename, mime, base64 }
const renderPdfInput = z.object({ cv: UnifiedCvSchema, template: z.enum(['modern', 'compact', 'classic']) })
app.post('/api/render/pdf', asyncHandler(async (req, res) => {
  const validation = renderPdfInput.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({ error: 'Invalid input', details: validation.error.errors })
  }
  try {
    const { cv, template } = validation.data
    const buffer = await renderPdfBuffer(cv, template)
    const base64 = buffer.toString('base64')
    return res.json({ filename: `cv_${template}.pdf`, mime: 'application/pdf', base64 })
  } catch (err) {
    return res.status(500).json({ error: 'render_pdf_failed', message: err.message })
  }
}))

// POST /api/render/docx { cv, template } -> { filename, mime, base64 }
const renderDocxInput = z.object({ cv: UnifiedCvSchema, template: z.enum(['modern', 'compact', 'classic']) })
app.post('/api/render/docx', asyncHandler(async (req, res) => {
  const validation = renderDocxInput.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({ error: 'Invalid input', details: validation.error.errors })
  }
  try {
    const { cv, template } = validation.data
    const buffer = await renderDocxBuffer(cv, template)
    const base64 = buffer.toString('base64')
    return res.json({ filename: `cv_${template}.docx`, mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', base64 })
  } catch (err) {
    return res.status(500).json({ error: 'render_docx_failed', message: err.message })
  }
}))

// POST /api/cover-letter { cv, target, jobText } -> { letter }
const coverLetterInput = z.object({ cv: UnifiedCvSchema, target: CvTargetSchema, jobText: z.string().optional().default('') })
app.post('/api/cover-letter', asyncHandler(async (req, res) => {
  const validation = coverLetterInput.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({ error: 'Invalid input', details: validation.error.errors })
  }
  try {
    const { cv, target, jobText } = validation.data
    const system = readPrompt('coverLetter.md')
    const user = JSON.stringify({ cv, target, jobText })
    // Request plain text; still force JSON mode off by expecting string
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: CURRENT_AI_MODEL, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_tokens: 700, temperature: 0 })
    })
    if (!response.ok) {
      const errTxt = await response.text()
      throw new Error(`OpenAI error: ${response.status} ${errTxt}`)
    }
    const data = await response.json()
    const letter = data.choices?.[0]?.message?.content || ''
    return res.json({ letter: letter.trim() })
  } catch (err) {
    return res.status(500).json({ error: 'cover_letter_failed', message: err.message })
  }
}))

// === SAVE/SHARE/ANALYTICS (Step-5) ===
const { randomId } = require('./src/lib/ids')
const { readJsonSafe, writeJsonAtomic, listJson } = require('./src/lib/fsdb')
const { BASE, DRAFTS_DIR, SHARES_DIR, LOGS_DIR, safeJoin, ensureBase } = require('./src/lib/paths')
ensureBase()

// Extra limiter on share endpoints
app.use('/api/share', rateLimit({ windowMs: 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many share requests' } }))

function maskIp(ip) {
  if (!ip) return ''
  const parts = ip.split('.')
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0`
  return ip
}

const draftSaveInput = z.object({ draftId: z.string().optional(), cv: z.any(), target: z.any().optional(), extras: z.any().optional() })
app.post('/api/drafts/save', asyncHandler(async (req, res) => {
  const v = draftSaveInput.safeParse(req.body)
  if (!v.success) return res.status(400).json({ error: { code: 'bad_request', message: v.error.message } })
  const now = new Date().toISOString()
  const id = v.data.draftId || randomId()
  const file = safeJoin(DRAFTS_DIR, `${id}.json`)
  const existing = await readJsonSafe(file)
  const payload = { draftId: id, cv: v.data.cv, target: v.data.target || existing?.target || {}, extras: v.data.extras || existing?.extras || {}, createdAt: existing?.createdAt || now, updatedAt: now, version: '1' }
  const { size } = await writeJsonAtomic(file, payload)
  return res.json({ draftId: id, savedAt: now, size })
}))

app.get('/api/drafts/:id', asyncHandler(async (req, res) => {
  const id = req.params.id
  if (!id || id.includes('..')) return res.status(400).json({ error: { code: 'bad_request', message: 'Invalid id' } })
  const file = safeJoin(DRAFTS_DIR, `${id}.json`)
  const data = await readJsonSafe(file)
  if (!data) return res.status(404).json({ error: { code: 'not_found', message: 'Draft not found' } })
  return res.json({ draftId: data.draftId, cv: data.cv, target: data.target || {}, extras: data.extras || {}, savedAt: data.updatedAt || data.createdAt })
}))

const shareCreateInput = z.object({ draftId: z.string().min(1), ttlDays: z.number().int().min(1).max(30).optional() })
app.post('/api/share/create', asyncHandler(async (req, res) => {
  const v = shareCreateInput.safeParse(req.body)
  if (!v.success) return res.status(400).json({ error: { code: 'bad_request', message: v.error.message } })
  const draftFile = safeJoin(DRAFTS_DIR, `${v.data.draftId}.json`)
  const draft = await readJsonSafe(draftFile)
  if (!draft) return res.status(404).json({ error: { code: 'not_found', message: 'Draft not found' } })
  const shareId = randomId()
  const createdAt = new Date().toISOString()
  const ttl = (v.data.ttlDays || 14)
  const expiresAt = new Date(Date.now() + ttl * 24 * 60 * 60 * 1000).toISOString()
  const mapFile = safeJoin(SHARES_DIR, `${shareId}.json`)
  await writeJsonAtomic(mapFile, { shareId, draftId: v.data.draftId, createdAt, expiresAt })
  const base = process.env.BASE_URL || ''
  const shareUrl = `${base}/s/${shareId}`
  return res.json({ shareId, shareUrl, expiresAt })
}))

app.get('/api/share/:shareId', asyncHandler(async (req, res) => {
  const shareId = req.params.shareId
  if (!shareId || shareId.includes('..')) return res.status(400).json({ error: { code: 'bad_request', message: 'Invalid id' } })
  const mapFile = safeJoin(SHARES_DIR, `${shareId}.json`)
  const map = await readJsonSafe(mapFile)
  if (!map) return res.status(404).json({ error: { code: 'not_found', message: 'Share not found' } })
  if (new Date(map.expiresAt).getTime() < Date.now()) return res.status(410).json({ error: { code: 'expired', message: 'Share expired' } })
  const draftFile = safeJoin(DRAFTS_DIR, `${map.draftId}.json`)
  const draft = await readJsonSafe(draftFile)
  if (!draft) return res.status(404).json({ error: { code: 'not_found', message: 'Draft not found' } })
  return res.json({ draftId: map.draftId, cv: draft.cv, target: draft.target || {}, extras: draft.extras || {}, createdAt: map.createdAt, expiresAt: map.expiresAt })
}))

const analyticsInput = z.object({ type: z.string().min(1), payload: z.any().optional() })
app.post('/api/analytics/event', asyncHandler(async (req, res) => {
  const v = analyticsInput.safeParse(req.body)
  if (!v.success) return res.status(400).json({ error: { code: 'bad_request', message: v.error.message } })
  const ym = new Date().toISOString().slice(0, 7).replace('-', '')
  const logFile = safeJoin(LOGS_DIR, `events-${ym}.jsonl`)
  const ipRaw = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString() || ''
  const ip = maskIp(ipRaw.split(',')[0].trim())
  const ua = (req.headers['user-agent'] || '').toString().slice(0, 160)
  const line = JSON.stringify({ ts: new Date().toISOString(), ip, ua, type: v.data.type, payload: v.data.payload || {} }) + '\n'
  await fs.promises.appendFile(logFile, line, 'utf8')
  return res.json({ ok: true })
}))

// hourly cleanup for expired shares
setInterval(async () => {
  try {
    const files = await listJson(SHARES_DIR)
    const now = Date.now()
    for (const f of files) {
      const m = await readJsonSafe(f)
      if (!m) continue
      if (new Date(m.expiresAt).getTime() < now) {
        await fs.promises.unlink(f).catch(() => { })
      }
    }
  } catch (e) {
    errorLog('Share cleanup failed:', e.message)
  }
}, 60 * 60 * 1000)
// POST /api/type-detect -> detect role/seniority/sector
const typeDetectInputSchema = z.object({ cv: UnifiedCvSchema })
const typeDetectResultSchema = z.object({
  role: z.string().optional().default(''),
  seniority: z.enum(['Intern', 'Junior', 'Mid', 'Senior', 'Lead', 'Manager', 'Director', 'VP', 'C-Level']).optional().default(''),
  sector: z.string().optional().default(''),
  confidence: z.number().min(0).max(1).optional().default(0),
})

app.post('/api/type-detect', asyncHandler(async (req, res) => {
  const validation = typeDetectInputSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({ error: 'Invalid input', details: validation.error.errors })
  }
  try {
    const cv = validation.data.cv
    const system = readPrompt('typeDetect.md')
    const user = JSON.stringify(cv)
    const json = await callJsonPrompt({ system, user, maxTokens: 500 })
    const out = typeDetectResultSchema.safeParse(json)
    if (!out.success) {
      return res.status(422).json({ error: 'Invalid typeDetect JSON from model', details: out.error.errors })
    }
    const merged = mergeCv(cv, { target: out.data })
    return res.json({ target: out.data, cv: merged })
  } catch (err) {
    return res.status(500).json({ error: 'type_detect_failed', message: err.message })
  }
}))

// POST /api/followups -> generate 4 follow-up questions
const followupsInputSchema = z.object({
  cv: UnifiedCvSchema,
  target: CvTargetSchema.optional(),
})
const followupQuestionSchema = z.object({ id: z.string().min(1), question: z.string().min(5).max(300) })
const followupsResultSchema = z.object({ questions: z.array(followupQuestionSchema).length(4) })

app.post('/api/followups', asyncHandler(async (req, res) => {
  const validation = followupsInputSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({ error: 'Invalid input', details: validation.error.errors })
  }
  try {
    const { cv, target } = validation.data
    const merged = mergeCv(cv, { target: target || {} })
    const system = readPrompt('followups.md')
    const user = JSON.stringify(merged)
    const json = await callJsonPrompt({ system, user, maxTokens: 800 })
    const out = followupsResultSchema.safeParse(json)
    if (!out.success) {
      return res.status(422).json({ error: 'Invalid followups JSON from model', details: out.error.errors })
    }
    return res.json({ questions: out.data.questions })
  } catch (err) {
    return res.status(500).json({ error: 'followups_failed', message: err.message })
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

  const { cvData, maxQuestions = 3, appLanguage = 'en', askedQuestions = [] } = validation.data;
  const userName = cvData?.personalInfo?.name?.split(' ')[0] || '';

  const systemPrompt = `You are a world-class CV optimization consultant and career coach named 'Alex'. Your mission is to identify the HIGHEST-IMPACT gaps in a user's CV and generate strategic, non-generic questions to fill them. You are friendly, insightful, and vary your questions.

${appLanguage === 'tr' ?
      'IMPORTANT: Respond in Turkish (Türkçe). Generate all questions and text in Turkish language. Address the user by their name if available.' :
      'IMPORTANT: Respond in English. Address the user by their name if available.'}

ANALYSIS & QUESTION STRATEGY:
1.  **Analyze Holistically**: First, understand the candidate's industry (e.g., Tech, Finance, Marketing), experience level (e.g., Junior, Senior, Manager), and career trajectory.
2.  **Prioritize High-Level Impact**: Avoid getting bogged down in minor project details. Focus on the bigger picture.
    *   **Instead of**: "Tell me more about the database migration in Project X."
    *   **Ask**: "Looking at your experience, what do you consider your most significant professional achievement and why was it impactful?" or "What kind of role are you targeting next, and how does your experience align with that goal?"
3.  **Identify Narrative Gaps**: Look for missing stories in their career.
    *   "You moved from Company X to Company Y where your role seems similar. What new skills or responsibilities did you take on in that transition?"
    *   "I see a collection of impressive skills. Can you give an example of a time you combined several of those skills to solve a particularly complex problem?"
4.  **Personalize Your Interaction**:
    *   If the user's name is available (e.g., '${userName}'), use it occasionally and naturally. Example: "Thanks, ${userName}. Now, let's dive into your experience at..."
    *   Vary your question style. Don't ask the same type of question repeatedly. Mix project-based questions, skill-deepening questions, and impact-quantification questions.
5.  **Avoid Redundancy**: Do not ask questions that have already been asked. A list of previously asked question keys is provided.

**Do NOT ask overly specific, low-level technical questions about individual projects unless it's the only area lacking detail. Focus on career growth, strategic impact, and unique skills.**

JSON FORMAT (exactly ${maxQuestions} unique, high-impact questions):
{
  "questions": [
    {
      "id": "q1",
      "question": "A specific, actionable question targeting a critical gap, sometimes personalized with the user's name.",
      "category": "project_deep_dive|skill_validation|impact_quantification|career_narrative",
      "hint": "Provide a clear, concise hint on what a strong answer looks like."
    }
  ]
}`;

  const userPrompt = `Based on this CV, generate ${maxQuestions} targeted, non-generic, and varied questions to help improve their profile.
Do not repeat any questions from this list of already asked questions: [${askedQuestions.join(', ')}]

User's Name: ${userName}
CV Data: ${JSON.stringify(cvData, null, 2)}

Generate questions that will help uncover the stories and specific details behind their achievements.`;

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

  const systemPrompt = `You are an expert CV writer and career coach. Your task is to perform a **holistic revision** of a CV based on user-provided answers to clarifying questions. You must intelligently integrate the new information, correct typos, and rewrite sections for maximum impact, particularly the summary.

**Core Instructions:**

1.  **Holistic Analysis**: First, review the entire original CV and all the user's answers to understand the full context of their career, skills, and recent input.
2.  **Smart Integration & Typo Correction**:
    *   Integrate the user's answers into the appropriate sections of the CV (experience, skills, projects, etc.).
    *   **Crucially, correct any spelling or grammatical errors (typos)** found in the user's answers to ensure the final CV is professional.
    *   Do more than just insert text. Rephrase and weave the new information into existing descriptions to create a smooth, compelling narrative.
3.  **Rewrite the Summary**:
    *   This is the most important part. **Completely rewrite the "summary" section.**
    *   The new summary should be a professional, impactful paragraph that synthesizes the most important aspects of the original CV **AND** the new information from the user's answers. It should reflect their overall professional profile.
4.  **Maintain Consistency**: Ensure the tone, formatting, and date formats (YYYY-MM) are consistent throughout the entire revised CV.
5.  **Output Format**:
    *   Return **ONLY** the complete, updated CV as a single, valid JSON object.
    *   The JSON structure must be identical to the input CV. Do not add or remove top-level keys.

**Example Thought Process:**
*User Answer: "I led a team of 5 engineers and we improved performance by 25% on the 'X' project."*
1.  **Integration**: Find the 'X' project or related job in the "experience" section.
2.  **Enhancement**: Add a bullet point like: "Led a team of 5 engineers to optimize Project X, achieving a 25% performance improvement."
3.  **Summary Rewrite**: Incorporate this achievement into the new summary: "...a results-oriented leader with proven experience in team management and performance optimization, as demonstrated by a 25% efficiency gain in a key project."

Now, perform this comprehensive revision.`

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

  // Yanıtları AI'dan al
  const systemPrompt = `You are a brutally honest, world-class CV assessment expert. Your task is to analyze the provided CV data (in JSON format) and give a brutally honest score out of 100. You must provide your response in valid JSON format. The user's application language is ${appLanguage}.

SCORING PHILOSOPHY: BE VERY STRICT AND "STINGY".
A truly exceptional, top-1% CV might get an 85-90. A decent CV is maybe a 50-60. Start with a baseline score of 20. Only award points for concrete, quantifiable, and impactful information. Penalize HEAVILY for vagueness, buzzwords, and lack of metrics.

CV SCORING CRITERIA (Total 100 points):
- Summary (25 pts): Is it a compelling executive summary with metrics, or a generic objective statement? (Penalize generic statements).
- Experience (40 pts): Are there QUANTIFIABLE achievements (e.g., "Increased revenue by 15%," "Reduced server costs by $5K/month")? Or just a list of responsibilities? (Penalize responsibility lists). Are the action verbs strong?
- Skills (15 pts): Are the skills relevant and specific? Is there evidence of these skills in the experience section? (Penalize skill lists that aren't backed by experience).
- Personal Info & Structure (10 pts): Is it complete and easy to read?
- Education & Others (10 pts): Is it relevant?

All your responses (strengths, weaknesses, suggestions) must be in ${appLanguage}.

Your final output must be a single valid JSON object with the following structure:
{
  "overall": <score_number>,
  "strengths": ["<strength_1_in_appLanguage>", "<strength_2_in_appLanguage>"],
  "weaknesses": ["<weakness_1_in_appLanguage>", "<weakness_2_in_appLanguage>"],
  "suggestions": ["<suggestion_1_in_appLanguage>", "<suggestion_2_in_appLanguage>"]
}
Do not include any text outside of this JSON object.
`;

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

  let companyInfo = '';
  if (companyName) {
    try {
      // Perform a quick web search for company info
      const searchResults = await web_search.search(`What is the company ${companyName} known for?`);
      if (searchResults && searchResults.length > 0) {
        companyInfo = `Company Background: ${searchResults[0].snippet}`;
      }
    } catch (searchError) {
      errorLog('Web search for company info failed:', searchError.message);
      // Proceed without company info if search fails
    }
  }

  const systemPrompt = `You are a professional cover letter writer. Your task is to generate a **concise, simple, and professional** cover letter based on the provided CV data. The response should be a single JSON object with a "coverLetter" key.

  **Tone**: Professional, direct, and confident.
  **Language**: ${appLanguage}.

  **Core Instructions**:
  1.  **Keep it Simple & High-Level**: The goal is a clean, easy-to-read cover letter. **DO NOT go into deep details about specific projects from the CV.** Instead, summarize the candidate's overall experience and key skill areas.
  2.  **Generic vs. Specific**:
      *   If **companyName** and **positionName** are NOT provided, write a strong, **general-purpose** cover letter. It should highlight their main qualifications.
      *   If **companyName** and **positionName** ARE provided, write a **targeted** letter. Use the company and position in the opening and closing. Subtly align the user's general skills to the role.
  3.  **Use Web Search Info (Subtly)**:
      *   If 'Company Background' info is available, you can add *one* sentence that shows interest in the company (e.g., "I have been following [Company Name]'s innovations in the field..."). Do not overdo it.
  4.  **Structure**:
      *   **Introduction**: State the purpose of the letter and the position being applied for (if known).
      *   **Body Paragraph**: In one or two short paragraphs, summarize the candidate's main qualifications and how their general experience (e.g., "my background in marketing," "my experience in software development") makes them a suitable candidate.
      *   **Conclusion**: A simple closing statement reiterating interest and inviting them to review the attached CV.
  5.  **Conciseness is Key**: The entire letter should be short, around 3 paragraphs.

  **CV Data for Context**:
  \`\`\`json
  ${JSON.stringify(cvData, null, 2)}
  \`\`\`
  ${companyInfo ? `\n**Company Research**: ${companyInfo}` : ''}

  Generate the cover letter based on these refined instructions. Output ONLY the JSON object.`;

  try {
    const coverLetterText = await callOpenAI(
      [{ role: 'system', content: systemPrompt }], 1000); // Reduced max_tokens for cover letter

    const coverLetterData = JSON.parse(coverLetterText);

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

  let companyInfo = '';
  if (companyName) {
    try {
      // Perform a quick web search for company info
      const searchResults = await web_search.search(`About ${companyName} company`);
      if (searchResults && searchResults.length > 0) {
        companyInfo = `Company Background: ${searchResults[0].snippet}`;
      }
    } catch (searchError) {
      errorLog('Web search for company info failed:', searchError.message);
      // Proceed without company info if search fails
    }
  }

  try {
    // Ensure cvData has proper structure for cover letter generation
    const safeCvData = {
      ...cvData,
      experience: Array.isArray(cvData.experience) ? cvData.experience : [],
      education: Array.isArray(cvData.education) ? cvData.education : [],
      skills: Array.isArray(cvData.skills) ? cvData.skills : [],
      languages: Array.isArray(cvData.languages) ? cvData.languages : [],
      certifications: Array.isArray(cvData.certifications) ? cvData.certifications : [],
      projects: Array.isArray(cvData.projects) ? cvData.projects : []
    }
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
${JSON.stringify(safeCvData, null, 2)}

${companyName || positionName ?
        `Target Application Details:
  ${companyName ? `Company: ${companyName}` : ''}
  ${positionName ? `Position: ${positionName}` : ''}
  
  Please customize the cover letter for this specific company and role.` :
        'Create a versatile and professional generic cover letter suitable for various roles in their field. It should be easily adaptable by the user.'
      }

${companyInfo ? `\n\nUse this brief company information to tailor the letter's tone and content: ${companyInfo}` : ''}
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
      await dataStorage.saveFinalizedData(sessionId, safeCvData, coverText, { coverLetterPdf: true }, req);
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

    const {
      cvData,
      cvLanguage = 'tr',
      sessionId,
      revisionRequest
    } = req.body

    if (!cvData) {
      return res.status(400).json({
        error: 'CV data is required',
        message: 'Please provide CV data for PDF generation'
      })
    }

    let dataToProcess = {
      ...cvData
    };

    // If a revision request is provided, call AI to update the CV data
    if (revisionRequest) {
      infoLog(`Revising CV for session ${sessionId} based on user request.`);
      const revisionPrompt = `You are a CV revision expert. A user wants to revise their CV. Based on their request, update the provided JSON CV data. Make intelligent and comprehensive changes across the entire CV structure (summary, experience, skills, etc.) to reflect the user's request.

User's Revision Request: "${revisionRequest}"

Current CV JSON Data:
${JSON.stringify(cvData, null, 2)}

Your task is to return the *complete, updated* CV data in the exact same JSON format.
- If the user asks to make the summary more professional, rewrite it.
- If they ask to remove a job, delete that entry from the experience array.
- If they ask to highlight certain skills, ensure they are prominent.
- Interpret the request and apply it thoughtfully to the whole CV.
- The output must be ONLY the revised JSON object.`;

      try {
        const revisedCvResult = await callOpenAI([{
          role: 'system',
          content: revisionPrompt
        }], 3500);
        dataToProcess = JSON.parse(revisedCvResult);
        infoLog(`Successfully revised CV data for session ${sessionId}.`);
      } catch (e) {
        errorLog(`Could not revise CV data for session ${sessionId}: ${e.message}`);
        // If revision fails, proceed with original data but log the error
      }
    } else if (dataToProcess.userAdditions && dataToProcess.userAdditions.length > 0) {
      // If no manual revision, perform the standard holistic improvement based on Q&A
      infoLog(`Performing holistic CV improvement for session ${sessionId}`);
      const answersText = dataToProcess.userAdditions.map(ua => `Q: ${ua.question}\nA: ${ua.answer}`).join('\n\n');
      const improvementPrompt = `You are an expert CV writer. Your task is to perform a **holistic revision** of a CV based on user-provided answers. You must intelligently integrate the new information, correct typos, and rewrite sections for maximum impact, particularly the summary.

**Core Instructions:**
1.  **Analyze**: Review the original CV and all the user's answers to understand the full context.
2.  **Integrate & Correct**: Integrate the user's answers into the appropriate sections (experience, skills, etc.). Correct any spelling or grammatical errors found in the answers.
3.  **Rewrite Summary**: Completely rewrite the "summary" section to be a professional, impactful paragraph that synthesizes the original CV and the new information from the user's answers.
4.  **Consistency**: Ensure the tone and formatting are consistent throughout.
5.  **Output**: Return **ONLY** the complete, updated CV as a single, valid JSON object, identical in structure to the input.

**Current CV JSON:**
${JSON.stringify(cvData, null, 2)}

**User's Answers:**
${answersText}

Now, return the complete, revised CV JSON.`;

      try {
        const improvedCvResult = await callOpenAI([{
          role: 'system',
          content: improvementPrompt
        }], 3500);
        dataToProcess = JSON.parse(improvedCvResult);
        infoLog(`Successfully performed holistic improvement for session ${sessionId}.`);
      } catch (e) {
        errorLog(`Could not perform holistic improvement for session ${sessionId}: ${e.message}`);
        // Proceed with original data if improvement fails
      }
    }

    // 2. Save Finalized Data (including any revisions or enhancements)
    try {
      // Correctly call saveFinalizedData with null for coverLetter and pdfPaths as they are not available yet.
      const savedPaths = await dataStorage.saveFinalizedData(sessionId, dataToProcess, null, null, req);
      infoLog(`Finalized data saved for session ${sessionId} at ${savedPaths.jsonDataPath}`);

      // 3. Generate PDF using the backend service
      try {
        const pdfService = require('./services/pdfService');
        // Use the 'dataToProcess' variable which contains the potentially revised data
        const pdfBuffer = await pdfService.createPdf(dataToProcess, cvLanguage);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=cv.pdf');
        res.send(pdfBuffer);
        infoLog('CV PDF generated successfully using backend service');
      } catch (pdfError) {
        errorLog('Backend CV PDF service failed:', pdfError);
        // Fallback to simple text response
        res.status(500).json({
          // Define a fallback message instead of using an undefined variable
          message: 'PDF generation failed on the server.',
          error: pdfError.message
        });
      }
    } catch (saveError) {
      errorLog(`Error saving finalized data: ${saveError.message}`);
      res.status(500).json({ message: 'Failed to save finalized CV data.', error: saveError.message });
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
    version: '1.2508.101530',
    timestamp: new Date().toISOString()
  })
}))

// Optional helper to avoid confusing 404 when user opens share URL directly
app.get('/s/:shareId', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Share link accessed. Use /api/share/:shareId to get the actual data.',
    shareId: req.params.shareId,
    apiEndpoint: `/api/share/${req.params.shareId}`
  })
})

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

// New endpoint to generate a dynamic skill-related question
app.post('/api/ai/generate-skill-question', asyncHandler(async (req, res) => {
  const validation = skillQuestionSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      error: 'Invalid input',
      details: validation.error.errors
    })
  }

  const {
    cvData,
    appLanguage
  } = validation.data

  const lastJob = cvData.experience && cvData.experience.length > 0 ? cvData.experience[0] : null
  const jobTitle = lastJob ? lastJob.position : 'your field'

  const systemPrompt = `You are a helpful AI assistant. Your goal is to generate a personalized question to ask the user about their skills, based on their CV. The question should have two parts:
1. Ask if their most recent job is still current.
2. Ask for their key skills, customizing the example skills based on their job title.

Respond in ${appLanguage}.

Your response must be a single JSON object with the key "question".
`
  const userPrompt = `Generate a personalized skill question for a user whose most recent job title is "${jobTitle}".

Examples:
- If the job is "Software Developer", the question could be: "Is your role as a Senior Software Developer still current? Also, could you list your key technical skills (e.g., Python, AWS, SQL)?"
- If the job is "Accountant", it could be: "Are you still working as an Accountant? Also, please list your main accounting skills (e.g., Financial Reporting, Tax Preparation, QuickBooks)."
- If no job title is available, use a general question: "Is your last professional role still current? Also, please list your key professional skills."

Generate the question now.
`

  try {
    const result = await callOpenAI([{
      role: 'system',
      content: systemPrompt
    }, {
      role: 'user',
      content: userPrompt
    }], 200)

    const questionData = JSON.parse(result)
    infoLog(`Generated skill question for job title: ${jobTitle}`)
    res.json(questionData)
  } catch (error) {
    errorLog('Generate skill question error:', error)
    res.status(500).json({
      error: 'Failed to generate skill question',
      message: error.message
    })
  }
}))

// New endpoint for profession-specific skill assessment
app.post('/api/ai/generate-skill-assessment', asyncHandler(async (req, res) => {
  const validation = skillAssessmentSchema.safeParse(req.body)
  if (!validation.success) {
    return res.status(400).json({
      error: 'Invalid input',
      details: validation.error.errors
    })
  }

  const { cvData, appLanguage } = validation.data
  const getProfessionContext = (cv) => {
    const title = cv.experience && cv.experience.length > 0 ? cv.experience[0].position : 'Not specified';
    const summary = cv.summary || 'Not specified';
    // Handle both array of strings and array of objects for skills
    let skills = 'Not specified';
    if (cv.skills && Array.isArray(cv.skills)) {
      if (cv.skills.length > 0 && cv.skills.every(s => typeof s === 'string')) {
        skills = cv.skills.join(', ');
      } else if (cv.skills.length > 0 && cv.skills.every(s => typeof s === 'object' && s.name)) {
        skills = cv.skills.map(s => s.name).join(', ');
      }
    }

    return `
      Title: ${title}
      Summary: ${summary}
      Existing Skills: ${skills}
    `;
  }

  const professionContext = getProfessionContext(cvData);

  const systemPrompt = `You are an AI assistant specializing in career development. Your task is to generate a short, multiple-choice skill assessment questionnaire based on a user's professional context.

**Primary Goal:** Generate 3-4 **specific, high-value** skill questions relevant to the user's identified profession from their CV context.
- **Context:**
  ${professionContext}

**Fallback Instruction (Crucial):**
- If the provided context is too generic or a specific profession cannot be determined, **DO NOT return an empty list.**
- Instead, generate 3-4 **general professional skill** questions that are valuable across most white-collar jobs.
- **Examples of good fallback questions:**
  - "What is your proficiency with project management tools (e.g., Jira, Trello, Asana)?"
  - "How would you rate your data analysis skills using tools like Excel or Google Sheets?"
  - "What is your experience level with CRM software (e.g., Salesforce, HubSpot)?"
  - "How would you describe your public speaking and presentation skills?"

**Output Format:**
- The response MUST be a single JSON object.
- The object must contain a key named "questions", which is an array of question objects.
- Each question object must have:
  1. "key": A unique camelCase identifier for the skill (e.g., "autocadProficiency", "projectManagement").
  2. "question": The question text, localized in ${appLanguage}.
  3. "options": An array of four strings for the user to choose from, localized in ${appLanguage}: ["Advanced", "Intermediate", "Beginner", "None"].

**Example for a Software Engineer (in English):**
\`\`\`json
{
  "questions": [
    {
      "key": "pythonProficiency",
      "question": "What is your proficiency level in Python?",
      "options": ["Advanced", "Intermediate", "Beginner", "None"]
    },
    {
      "key": "cloudComputing",
      "question": "What is your experience level with cloud platforms like AWS or Azure?",
      "options": ["Advanced", "Intermediate", "Beginner", "None"]
    },
    {
      "key": "agileMethodologies",
      "question": "How familiar are you with Agile methodologies?",
      "options": ["Advanced", "Intermediate", "Beginner", "None"]
    }
  ]
}
\`\`\`
`
  const userPrompt = `Based on the following professional context, generate 3-4 specific skill assessment questions.

Professional Context:
${professionContext}
`

  try {
    const result = await callOpenAI([{
      role: 'system',
      content: systemPrompt
    }, {
      role: 'user',
      content: userPrompt
    }], 1000)

    const questionsData = JSON.parse(result)
    infoLog(`Generated skill assessment for context: ${professionContext.replace(/\s+/g, ' ')}`)
    res.json(questionsData)
  } catch (error) {
    errorLog('Generate skill assessment error:', error)
    res.status(500).json({
      error: 'Failed to generate skill assessment questions',
      message: error.message
    })
  }
}))


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
