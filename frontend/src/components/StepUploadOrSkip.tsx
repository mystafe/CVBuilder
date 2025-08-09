import React, { useState, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Upload,
  File,
  FileText,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Check,
  Loader2
} from "lucide-react"
import * as pdfjsLib from "pdfjs-dist"
import mammoth from "mammoth"

import { Button, Card } from "./ui"
import { theme } from "../theme"

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

interface FileData {
  rawText: string
  filename: string
  size: number
  type: string
}

interface StepUploadOrSkipProps {
  onContinue: (fileData?: FileData) => void
  className?: string
}

const ACCEPTED_TYPES = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
  "application/msword": ".doc"
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let fullText = ""

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map((item: any) => item.str).join(" ")
      fullText += pageText + "\n"
    }

    return fullText.trim()
  } catch (error) {
    console.error("PDF extraction error:", error)
    throw new Error("Failed to extract text from PDF")
  }
}

const extractTextFromDOCX = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value.trim()
  } catch (error) {
    console.error("DOCX extraction error:", error)
    throw new Error("Failed to extract text from DOCX")
  }
}

const saveFileDataToStorage = (fileData: FileData): void => {
  try {
    localStorage.setItem("cvbuilder.fileData", JSON.stringify(fileData))
  } catch (error) {
    console.error("Failed to save file data:", error)
  }
}

export const StepUploadOrSkip: React.FC<StepUploadOrSkipProps> = ({
  onContinue,
  className = ""
}) => {
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [extractedText, setExtractedText] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string>("")
  const [showPreview, setShowPreview] = useState(false)
  const [uploadComplete, setUploadComplete] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const validateFile = (file: File): string | null => {
    if (!Object.keys(ACCEPTED_TYPES).includes(file.type)) {
      return "Please upload a PDF or DOCX file"
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than ${formatFileSize(MAX_FILE_SIZE)}`
    }
    return null
  }

  const processFile = useCallback(async (selectedFile: File) => {
    const validationError = validateFile(selectedFile)
    if (validationError) {
      setError(validationError)
      return
    }

    setFile(selectedFile)
    setError("")
    setIsProcessing(true)
    setUploadComplete(false)

    try {
      let text = ""

      if (selectedFile.type === "application/pdf") {
        text = await extractTextFromPDF(selectedFile)
      } else if (
        selectedFile.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        selectedFile.type === "application/msword"
      ) {
        text = await extractTextFromDOCX(selectedFile)
      }

      if (!text.trim()) {
        throw new Error("No text could be extracted from the file")
      }

      setExtractedText(text)
      setUploadComplete(true)
      setShowPreview(true)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to process file"
      setError(errorMessage)
      setFile(null)
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true)
    }
  }, [])

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processFile(e.dataTransfer.files[0])
      }
    },
    [processFile]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        processFile(e.target.files[0])
      }
    },
    [processFile]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      fileInputRef.current?.click()
    }
  }

  const removeFile = () => {
    setFile(null)
    setExtractedText("")
    setError("")
    setUploadComplete(false)
    setShowPreview(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleContinueWithFile = () => {
    if (file && extractedText) {
      const fileData: FileData = {
        rawText: extractedText,
        filename: file.name,
        size: file.size,
        type: file.type
      }
      saveFileDataToStorage(fileData)
      onContinue(fileData)
    }
  }

  const handleSkip = () => {
    onContinue()
  }

  const getFileIcon = (fileType: string) => {
    if (fileType === "application/pdf") {
      return <FileText className="w-6 h-6 text-red-500" />
    }
    return <File className="w-6 h-6 text-blue-500" />
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`space-y-6 ${className}`}
    >
      {/* Upload Area */}
      <Card className="overflow-hidden">
        <motion.div
          ref={dropZoneRef}
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300
            ${
              dragActive
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                : error
                ? "border-red-300 bg-red-50 dark:bg-red-950"
                : uploadComplete
                ? "border-green-300 bg-green-50 dark:bg-green-950"
                : "border-gray-300 hover:border-gray-400"
            }
            ${!file ? "cursor-pointer" : ""}
            focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2
          `}
          onClick={() => !file && fileInputRef.current?.click()}
          onDragEnter={handleDragIn}
          onDragLeave={handleDragOut}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onKeyDown={handleKeyDown}
          tabIndex={file ? -1 : 0}
          role={file ? undefined : "button"}
          aria-label={file ? undefined : "Upload file"}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={Object.values(ACCEPTED_TYPES).join(",")}
            onChange={handleFileSelect}
            className="hidden"
            disabled={isProcessing}
          />

          <AnimatePresence mode="wait">
            {isProcessing ? (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="space-y-4"
              >
                <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-500" />
                <p className={`text-lg ${theme.colors.text.primary}`}>
                  Processing your file...
                </p>
                <p className={`text-sm ${theme.colors.text.secondary}`}>
                  Extracting text from {file?.name}
                </p>
              </motion.div>
            ) : file && uploadComplete ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-center">
                  <Check className="w-12 h-12 text-green-500" />
                </div>
                <p
                  className={`text-lg font-medium ${theme.colors.text.primary}`}
                >
                  File uploaded successfully!
                </p>
                <div className="flex items-center justify-center space-x-3 text-sm">
                  {getFileIcon(file.type)}
                  <span className={theme.colors.text.secondary}>
                    {file.name}
                  </span>
                  <span className={theme.colors.text.tertiary}>
                    ({formatFileSize(file.size)})
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFile()
                    }}
                    className="ml-2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="upload"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="space-y-4"
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="mx-auto"
                >
                  <Upload className="w-16 h-16 mx-auto text-gray-400" />
                </motion.div>
                <div>
                  <p
                    className={`text-xl font-medium mb-2 ${theme.colors.text.primary}`}
                  >
                    Upload your CV
                  </p>
                  <p className={`text-sm ${theme.colors.text.secondary} mb-4`}>
                    Drag and drop your file here, or click to browse
                  </p>
                  <p className={`text-xs ${theme.colors.text.tertiary}`}>
                    Supports PDF and DOCX files up to{" "}
                    {formatFileSize(MAX_FILE_SIZE)}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 py-3 bg-red-50 dark:bg-red-950 border-t border-red-200 dark:border-red-800"
            >
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-red-700 dark:text-red-300 text-sm">
                  {error}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Text Preview */}
      <AnimatePresence>
        {extractedText && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <div className="space-y-4">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={`
                    flex items-center justify-between w-full text-left
                    ${theme.colors.text.primary} hover:${theme.colors.text.secondary}
                    transition-colors
                  `}
                >
                  <h3 className="text-lg font-medium">Text Preview</h3>
                  <motion.div
                    animate={{ rotate: showPreview ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-5 h-5" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {showPreview && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div
                        className={`
                        max-h-64 overflow-y-auto p-4 
                        ${theme.colors.background.tertiary} 
                        rounded-lg text-sm 
                        ${theme.colors.text.secondary}
                        border border-gray-200 dark:border-gray-700
                      `}
                      >
                        <pre className="whitespace-pre-wrap font-mono">
                          {extractedText.substring(0, 1000)}
                          {extractedText.length > 1000 && "..."}
                        </pre>
                      </div>
                      <p
                        className={`text-xs ${theme.colors.text.tertiary} mt-2`}
                      >
                        Extracted {extractedText.length} characters
                        {extractedText.length > 1000 && " (showing first 1000)"}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col sm:flex-row gap-4 justify-center"
      >
        {file && uploadComplete ? (
          <Button
            onClick={handleContinueWithFile}
            size="lg"
            className="flex-1 sm:flex-none"
          >
            <FileText className="w-5 h-5 mr-2" />
            Continue with {file.name}
          </Button>
        ) : (
          <Button
            onClick={handleSkip}
            variant="secondary"
            size="lg"
            className="flex-1 sm:flex-none"
          >
            <ChevronUp className="w-5 h-5 mr-2" />
            Start from Scratch
          </Button>
        )}

        {!uploadComplete && (
          <Button
            onClick={handleSkip}
            variant="ghost"
            size="lg"
            className="flex-1 sm:flex-none"
          >
            Skip Upload
          </Button>
        )}
      </motion.div>

      {/* Help Text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center"
      >
        <p className={`text-sm ${theme.colors.text.tertiary}`}>
          {file
            ? "Your file has been processed and is ready to use."
            : "Upload your existing CV to get started, or create one from scratch."}
        </p>
      </motion.div>
    </motion.div>
  )
}

export default StepUploadOrSkip
