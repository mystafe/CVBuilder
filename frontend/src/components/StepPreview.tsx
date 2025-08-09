import React, { useState } from "react"
import { CVData } from "../lib/flow"
import { useWriteCoverLetterMutation } from "../lib/api"
import PreviewPane from "./PreviewPane"
import { Button } from "./ui"
import { Download, FileText, Loader2, Package } from "lucide-react"
import { generateCVPDF, generateCombinedPDF } from "../lib/pdf"
import { useToast } from "./Toast"
import { useAsyncAnnouncer } from "./AriaLive"
// ButtonSkeleton removed as it's not used in this component

interface StepPreviewProps {
  cvData: CVData
  onNext?: () => void
  onBack?: () => void
  className?: string
}

const StepPreview: React.FC<StepPreviewProps> = ({
  cvData,
  onNext,
  onBack,
  className = ""
}) => {
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false)
  const [coverLetter, setCoverLetter] = useState<string>("")
  const [isDownloadingCV, setIsDownloadingCV] = useState(false)
  const [isDownloadingBoth, setIsDownloadingBoth] = useState(false)
  const [roleHint, setRoleHint] = useState("")

  const coverLetterMutation = useWriteCoverLetterMutation()
  const toast = useToast()
  const { announceLoading, announceSuccess, announceError } =
    useAsyncAnnouncer()

  const handleGenerateCoverLetter = async () => {
    if (!cvData.personalInfo.name) {
      toast.error("CV Incomplete", "Please complete your CV information first.")
      announceError("Cover letter generation", "CV information is incomplete")
      return
    }

    setIsGeneratingCoverLetter(true)
    announceLoading("Generating cover letter")

    try {
      const result = await coverLetterMutation.mutateAsync({
        cv: cvData,
        roleHint: roleHint || undefined
      })
      setCoverLetter(result)
      toast.success(
        "Cover Letter Generated",
        "Your personalized cover letter is ready!"
      )
      announceSuccess(
        "Cover letter generation",
        "Cover letter has been generated and is ready for review"
      )
    } catch (error) {
      console.error("Failed to generate cover letter:", error)
      const errorMessage =
        error instanceof Error ? error.message : "Please try again."
      toast.error(
        "Generation Failed",
        `Failed to generate cover letter. ${errorMessage}`
      )
      announceError("Cover letter generation", errorMessage)
    } finally {
      setIsGeneratingCoverLetter(false)
    }
  }

  const handleDownloadCV = async () => {
    if (!cvData.personalInfo.name) {
      toast.error("CV Incomplete", "Please complete your CV information first.")
      announceError("CV download", "CV information is incomplete")
      return
    }

    setIsDownloadingCV(true)
    announceLoading("Generating CV PDF")

    try {
      await generateCVPDF(cvData)
      toast.success(
        "CV Downloaded",
        "Your CV has been downloaded successfully!"
      )
      announceSuccess("CV download", "CV PDF has been generated and downloaded")
    } catch (error) {
      console.error("Failed to generate CV PDF:", error)
      const errorMessage =
        error instanceof Error ? error.message : "Please try again."
      toast.error(
        "Download Failed",
        `Failed to generate CV PDF. ${errorMessage}`
      )
      announceError("CV download", errorMessage)
    } finally {
      setIsDownloadingCV(false)
    }
  }

  const handleDownloadBoth = async () => {
    if (!cvData.personalInfo.name) {
      toast.error("CV Incomplete", "Please complete your CV information first.")
      announceError("Combined download", "CV information is incomplete")
      return
    }

    if (!coverLetter) {
      toast.error(
        "Cover Letter Missing",
        "Please generate a cover letter first."
      )
      announceError("Combined download", "Cover letter has not been generated")
      return
    }

    setIsDownloadingBoth(true)
    announceLoading("Generating combined PDF")

    try {
      await generateCombinedPDF(cvData, coverLetter)
      toast.success(
        "Combined PDF Downloaded",
        "Your CV and cover letter have been downloaded together!"
      )
      announceSuccess(
        "Combined download",
        "Combined PDF with CV and cover letter has been generated and downloaded"
      )
    } catch (error) {
      console.error("Failed to generate combined PDF:", error)
      const errorMessage =
        error instanceof Error ? error.message : "Please try again."
      toast.error(
        "Download Failed",
        `Failed to generate combined PDF. ${errorMessage}`
      )
      announceError("Combined download", errorMessage)
    } finally {
      setIsDownloadingBoth(false)
    }
  }

  const isLoading =
    isGeneratingCoverLetter || isDownloadingCV || isDownloadingBoth

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Your CV is Ready!
        </h2>
        <p className="text-gray-600">
          Preview your CV and download it, or generate a matching cover letter.
        </p>
      </div>

      {/* Preview Pane */}
      <PreviewPane cvData={cvData} />

      {/* Actions Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Download Options
        </h3>

        {/* Quick Download CV */}
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Download CV</h4>
              <p className="text-sm text-gray-600">Get your CV as a PDF file</p>
            </div>
          </div>
          <Button
            onClick={handleDownloadCV}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isDownloadingCV ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download CV
          </Button>
        </div>

        {/* Cover Letter Section */}
        <div className="border-t pt-6">
          <h4 className="font-medium text-gray-900 mb-4">
            Generate Cover Letter
          </h4>

          {!coverLetter ? (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="roleHint"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Target Role (Optional)
                </label>
                <input
                  type="text"
                  id="roleHint"
                  value={roleHint}
                  onChange={(e) => setRoleHint(e.target.value)}
                  placeholder="e.g., Software Engineer, Data Scientist, Product Manager"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus-visible:ring-2"
                  disabled={isLoading}
                  aria-describedby="roleHint-description"
                />
                <p
                  id="roleHint-description"
                  className="mt-1 text-xs text-gray-500"
                >
                  Providing a target role helps generate a more tailored cover
                  letter
                </p>
              </div>

              <Button
                onClick={handleGenerateCoverLetter}
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {isGeneratingCoverLetter ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Generate Cover Letter
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="p-1 bg-green-100 rounded">
                    <FileText className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-green-800">
                    Cover Letter Generated Successfully
                  </span>
                </div>
                <div className="bg-white rounded p-3 border border-green-200 max-h-40 overflow-y-auto">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {coverLetter}
                  </pre>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={() => {
                    setCoverLetter("")
                    setRoleHint("")
                  }}
                  variant="secondary"
                  className="flex-1"
                  disabled={isLoading}
                >
                  Generate New
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Combined Download */}
        {coverLetter && (
          <div className="border-t pt-6">
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Package className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">
                    Download Both (Combined PDF)
                  </h4>
                  <p className="text-sm text-gray-600">
                    Get CV and cover letter in a single PDF
                  </p>
                </div>
              </div>
              <Button
                onClick={handleDownloadBoth}
                disabled={isLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isDownloadingBoth ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download Both
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6">
        {onBack && (
          <Button
            onClick={onBack}
            variant="secondary"
            disabled={isLoading}
            className="text-gray-600 border-gray-300 hover:bg-gray-50"
          >
            Back to Review
          </Button>
        )}

        <div className="flex-1" />

        {onNext && (
          <Button
            onClick={onNext}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Finish
          </Button>
        )}
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-gray-900">
              {isGeneratingCoverLetter && "Generating cover letter..."}
              {isDownloadingCV && "Generating CV PDF..."}
              {isDownloadingBoth && "Generating combined PDF..."}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default StepPreview
