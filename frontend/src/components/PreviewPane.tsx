import React, { useState, useEffect } from "react"
import { CVData } from "../lib/flow"
import { Card } from "./ui"
import {
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Code,
  Award,
  Globe,
  User,
  FolderOpen,
  Calendar,
  ExternalLink
} from "lucide-react"

interface PreviewPaneProps {
  cvData: CVData
  className?: string
}

type TemplateType = "modern" | "classic" | "compact"

const PreviewPane: React.FC<PreviewPaneProps> = ({
  cvData,
  className = ""
}) => {
  const [activeTemplate, setActiveTemplate] = useState<TemplateType>("modern")

  // Add print styles
  useEffect(() => {
    const printStyles = `
      @media print {
        @page {
          size: A4;
          margin: 0.5in 0.75in;
          -webkit-print-color-adjust: exact;
          color-adjust: exact;
        }
        
        * {
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        body {
          font-size: 12pt !important;
          line-height: 1.4 !important;
        }
        
        .print\\:break-inside-avoid {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }
        
        /* Ensure section headers stay with content */
        h1, h2, h3 {
          break-after: avoid !important;
          page-break-after: avoid !important;
          orphans: 3 !important;
          widows: 3 !important;
        }
        
        /* Avoid breaking lists and experience items */
        ul, ol, [data-experience-item] {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }
        
        /* Print-specific font sizes */
        .print\\:text-xs { font-size: 10pt !important; }
        .print\\:text-sm { font-size: 11pt !important; }
        .print\\:text-base { font-size: 12pt !important; }
        .print\\:text-lg { font-size: 14pt !important; }
        .print\\:text-xl { font-size: 16pt !important; }
        .print\\:text-2xl { font-size: 18pt !important; }
        .print\\:text-3xl { font-size: 22pt !important; }
        
        /* Remove elements that don't print well */
        .print\\:shadow-none { box-shadow: none !important; }
        .print\\:border-none { border: none !important; }
        .print\\:rounded-none { border-radius: 0 !important; }
        .print\\:bg-white { background-color: white !important; }
        .print\\:bg-blue-50 { background-color: #eff6ff !important; }
        .print\\:bg-blue-600 { background-color: #2563eb !important; }
        .print\\:bg-blue-700 { background-color: #1d4ed8 !important; }
        .print\\:border-gray-600 { border-color: #4b5563 !important; }
        
        /* Hide interactive elements and buttons */
        button:not(.print\\:block), 
        .hover\\:underline:hover,
        [role="button"]:not(.print\\:block) {
          display: none !important;
        }
        
        /* Ensure proper link styling */
        a {
          color: inherit !important;
          text-decoration: underline !important;
        }
        
        /* Grid layouts for print */
        .print\\:grid-cols-2 {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
        
        .print\\:overflow-visible {
          overflow: visible !important;
        }
        
        .print\\:max-w-none {
          max-width: none !important;
        }
        
        .print\\:transform-none {
          transform: none !important;
        }
        
        .print\\:w-full {
          width: 100% !important;
        }
        
        .print\\:h-full {
          height: 100% !important;
        }
        
        .print\\:scale-100 {
          transform: scale(1) !important;
        }
      }
    `

    // Create and append style element
    const styleElement = document.createElement("style")
    styleElement.type = "text/css"
    styleElement.innerHTML = printStyles
    styleElement.id = "cv-print-styles"

    // Remove existing print styles if any
    const existingStyles = document.getElementById("cv-print-styles")
    if (existingStyles) {
      existingStyles.remove()
    }

    document.head.appendChild(styleElement)

    // Cleanup function
    return () => {
      const element = document.getElementById("cv-print-styles")
      if (element) {
        element.remove()
      }
    }
  }, [])

  const formatDate = (start: string, end: string) => {
    if (!start && !end) return ""
    if (end === "Present" || end === "Current") return `${start} - Present`
    return `${start} - ${end}`
  }

  const ModernTemplate = () => (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden print:shadow-none print:rounded-none relative">
      {/* Left Color Stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-blue-500 to-blue-700 print:bg-blue-600"></div>

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 text-gray-800 p-8 pl-12 print:bg-blue-50 border-b-4 border-blue-500">
        <h1 className="text-4xl font-bold mb-3 print:text-3xl text-blue-900">
          {cvData.personalInfo.name}
        </h1>
        <div className="flex flex-wrap gap-6 text-blue-700">
          {cvData.personalInfo.email && (
            <span className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {cvData.personalInfo.email}
            </span>
          )}
          {cvData.personalInfo.phone && (
            <span className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              {cvData.personalInfo.phone}
            </span>
          )}
          {cvData.personalInfo.location && (
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {cvData.personalInfo.location}
            </span>
          )}
        </div>
      </div>

      <div className="p-8 pl-12 space-y-8">
        {/* Summary */}
        {cvData.summary && (
          <section className="print:break-inside-avoid">
            <h2 className="text-2xl font-black text-blue-900 mb-4 flex items-center gap-3 border-b-3 border-blue-300 pb-3">
              <User className="w-6 h-6 text-blue-600" />
              Professional Summary
            </h2>
            <p className="text-gray-700 leading-relaxed text-justify">
              {cvData.summary}
            </p>
          </section>
        )}

        {/* Experience */}
        {cvData.experience.length > 0 && (
          <section className="print:break-inside-avoid">
            <h2 className="text-2xl font-black text-blue-900 mb-4 flex items-center gap-3 border-b-3 border-blue-300 pb-3">
              <Briefcase className="w-6 h-6 text-blue-600" />
              Professional Experience
            </h2>
            <div className="space-y-6">
              {cvData.experience.map((exp, index) => (
                <div
                  key={index}
                  className="border-l-4 border-blue-300 pl-6 print:break-inside-avoid"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 mb-1">
                        {exp.title}
                      </h3>
                      <p className="text-lg text-blue-700 font-semibold mb-1 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {exp.company}
                      </p>
                      {exp.location && (
                        <p className="text-gray-600 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {exp.location}
                        </p>
                      )}
                    </div>
                    <span className="text-gray-500 font-semibold bg-blue-50 px-3 py-1 rounded-lg whitespace-nowrap ml-4">
                      {formatDate(exp.start, exp.end)}
                    </span>
                  </div>
                  {exp.bullets && exp.bullets.length > 0 && (
                    <ul className="list-disc list-inside space-y-2 text-gray-700">
                      {exp.bullets.map((bullet, bulletIndex) => (
                        <li key={bulletIndex} className="leading-relaxed pl-2">
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Education */}
        {cvData.education.length > 0 && (
          <section className="print:break-inside-avoid">
            <h2 className="text-2xl font-black text-blue-900 mb-4 flex items-center gap-3 border-b-3 border-blue-300 pb-3">
              <GraduationCap className="w-6 h-6 text-blue-600" />
              Education
            </h2>
            <div className="space-y-4">
              {cvData.education.map((edu, index) => (
                <div
                  key={index}
                  className="border-l-4 border-blue-200 pl-6 print:break-inside-avoid"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-800 mb-1">
                        {edu.degree}
                      </h3>
                      <p className="text-blue-700 font-semibold mb-1">
                        {edu.institution}
                      </p>
                      {edu.location && (
                        <p className="text-gray-600 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {edu.location}
                        </p>
                      )}
                      {edu.gpa && (
                        <p className="text-gray-700 font-medium">
                          GPA: {edu.gpa}
                        </p>
                      )}
                    </div>
                    <span className="text-gray-500 font-semibold bg-blue-50 px-3 py-1 rounded-lg whitespace-nowrap ml-4">
                      {formatDate(edu.start, edu.end)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Skills */}
        {cvData.skills.length > 0 && (
          <section className="print:break-inside-avoid">
            <h2 className="text-2xl font-black text-blue-900 mb-4 flex items-center gap-3 border-b-3 border-blue-300 pb-3">
              <Code className="w-6 h-6 text-blue-600" />
              Skills
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(
                cvData.skills.reduce((acc, skill) => {
                  if (!acc[skill.category]) acc[skill.category] = []
                  acc[skill.category].push(skill)
                  return acc
                }, {} as Record<string, typeof cvData.skills>)
              ).map(([category, skills]) => (
                <div key={category}>
                  <h3 className="font-semibold text-gray-800 mb-2">
                    {category}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, index) => (
                      <span
                        key={index}
                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {skill.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Projects */}
        {cvData.projects.length > 0 && (
          <section className="print:break-inside-avoid">
            <h2 className="text-2xl font-black text-blue-900 mb-4 flex items-center gap-3 border-b-3 border-blue-300 pb-3">
              <FolderOpen className="w-6 h-6 text-blue-600" />
              Projects
            </h2>
            <div className="space-y-6">
              {cvData.projects.map((project, index) => (
                <div
                  key={index}
                  className="border-l-4 border-blue-200 pl-6 print:break-inside-avoid"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-bold text-gray-800 flex-1">
                      {project.name}
                    </h3>
                    {project.start && project.end && (
                      <span className="text-gray-500 font-semibold bg-blue-50 px-3 py-1 rounded-lg whitespace-nowrap ml-4">
                        {formatDate(project.start, project.end)}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 mb-3 leading-relaxed">
                    {project.description}
                  </p>
                  {project.technologies && project.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {project.technologies.map((tech, techIndex) => (
                        <span
                          key={techIndex}
                          className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                  {project.url && (
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center gap-1 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View Project
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Additional sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Certificates */}
          {cvData.certificates.length > 0 && (
            <section className="print:break-inside-avoid">
              <h2 className="text-xl font-black text-blue-900 mb-3 flex items-center gap-2 border-b-2 border-blue-300 pb-2">
                <Award className="w-5 h-5 text-blue-600" />
                Certificates
              </h2>
              <ul className="space-y-2">
                {cvData.certificates.map((cert, index) => (
                  <li
                    key={index}
                    className="text-gray-700 flex items-start gap-2"
                  >
                    <Award className="w-3 h-3 text-blue-500 mt-1 flex-shrink-0" />
                    {cert}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Languages */}
          {cvData.languages.length > 0 && (
            <section className="print:break-inside-avoid">
              <h2 className="text-xl font-black text-blue-900 mb-3 flex items-center gap-2 border-b-2 border-blue-300 pb-2">
                <Globe className="w-5 h-5 text-blue-600" />
                Languages
              </h2>
              <div className="space-y-3">
                {cvData.languages.map((lang, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center bg-blue-50 px-3 py-2 rounded-lg"
                  >
                    <span className="text-gray-800 font-semibold">
                      {lang.language}
                    </span>
                    <span className="text-blue-700 font-medium text-sm">
                      {lang.proficiency}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )

  const ClassicTemplate = () => (
    <div className="bg-white border-2 border-gray-800 print:border-gray-600 font-serif">
      {/* Header */}
      <div className="border-b-4 border-gray-900 p-8 text-center bg-gray-50 print:bg-white">
        <h1 className="text-4xl font-bold text-gray-900 mb-4 print:text-3xl tracking-wide">
          {cvData.personalInfo.name.toUpperCase()}
        </h1>
        <div className="flex justify-center flex-wrap gap-8 text-gray-700 text-base">
          {cvData.personalInfo.email && (
            <span className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {cvData.personalInfo.email}
            </span>
          )}
          {cvData.personalInfo.phone && (
            <span className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              {cvData.personalInfo.phone}
            </span>
          )}
          {cvData.personalInfo.location && (
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {cvData.personalInfo.location}
            </span>
          )}
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* Summary */}
        {cvData.summary && (
          <section className="print:break-inside-avoid">
            <h2 className="text-2xl font-bold text-gray-900 mb-3 uppercase tracking-widest font-serif border-b-4 border-gray-900 pb-2">
              Professional Summary
            </h2>
            <div className="border-l-8 border-gray-300 pl-6 mt-4">
              <p className="text-gray-800 text-justify leading-relaxed">
                {cvData.summary}
              </p>
            </div>
          </section>
        )}

        {/* Experience */}
        {cvData.experience.length > 0 && (
          <section className="print:break-inside-avoid">
            <h2 className="text-2xl font-bold text-gray-900 mb-3 uppercase tracking-widest font-serif border-b-4 border-gray-900 pb-2">
              Professional Experience
            </h2>
            <div className="space-y-6 mt-4">
              {cvData.experience.map((exp, index) => (
                <div key={index} className="print:break-inside-avoid">
                  <div className="border-l-8 border-gray-300 pl-6">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-1 font-serif">
                          {exp.title}
                        </h3>
                        <p className="text-lg text-gray-700 font-semibold italic mb-1">
                          {exp.company}
                        </p>
                        {exp.location && (
                          <p className="text-gray-600 text-sm">
                            {exp.location}
                          </p>
                        )}
                      </div>
                      <span className="text-gray-600 font-medium border-2 border-gray-300 px-3 py-1 whitespace-nowrap ml-4">
                        {formatDate(exp.start, exp.end)}
                      </span>
                    </div>
                    {exp.bullets && exp.bullets.length > 0 && (
                      <ul className="list-disc list-inside space-y-1 text-gray-800 mt-3">
                        {exp.bullets.map((bullet, bulletIndex) => (
                          <li key={bulletIndex} className="leading-relaxed">
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {index < cvData.experience.length - 1 && (
                    <hr className="border-t-2 border-gray-400 mt-6" />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Education */}
        {cvData.education.length > 0 && (
          <section className="print:break-inside-avoid">
            <h2 className="text-2xl font-bold text-gray-900 mb-3 uppercase tracking-widest font-serif border-b-4 border-gray-900 pb-2">
              Education
            </h2>
            <div className="space-y-4 mt-4">
              {cvData.education.map((edu, index) => (
                <div
                  key={index}
                  className="border-l-8 border-gray-300 pl-6 print:break-inside-avoid"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 font-serif">
                        {edu.degree}
                      </h3>
                      <p className="text-gray-700 italic font-medium">
                        {edu.institution}
                        {edu.location && `, ${edu.location}`}
                      </p>
                      {edu.gpa && (
                        <p className="text-gray-600 text-sm mt-1">
                          GPA: {edu.gpa}
                        </p>
                      )}
                    </div>
                    <span className="text-gray-600 font-medium border-2 border-gray-300 px-3 py-1 whitespace-nowrap ml-4">
                      {formatDate(edu.start, edu.end)}
                    </span>
                  </div>
                  {index < cvData.education.length - 1 && (
                    <hr className="border-t border-gray-300 mt-4" />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Skills */}
        {cvData.skills.length > 0 && (
          <section className="print:break-inside-avoid">
            <h2 className="text-2xl font-bold text-gray-900 mb-3 uppercase tracking-widest font-serif border-b-4 border-gray-900 pb-2">
              Core Competencies
            </h2>
            <div className="border-l-8 border-gray-300 pl-6 mt-4">
              {Object.entries(
                cvData.skills.reduce((acc, skill) => {
                  if (!acc[skill.category]) acc[skill.category] = []
                  acc[skill.category].push(skill.name)
                  return acc
                }, {} as Record<string, string[]>)
              ).map(([category, skills]) => (
                <div key={category} className="mb-3">
                  <span className="font-bold text-gray-900 font-serif text-lg">
                    {category}:
                  </span>
                  <br />
                  <span className="text-gray-700 leading-relaxed">
                    {skills.join(" • ")}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Projects */}
        {cvData.projects.length > 0 && (
          <section className="print:break-inside-avoid">
            <h2 className="text-2xl font-bold text-gray-900 mb-3 uppercase tracking-widest font-serif border-b-4 border-gray-900 pb-2">
              Notable Projects
            </h2>
            <div className="space-y-4 mt-4">
              {cvData.projects.map((project, index) => (
                <div
                  key={index}
                  className="border-l-8 border-gray-300 pl-6 print:break-inside-avoid"
                >
                  <h3 className="font-bold text-gray-900 text-lg font-serif">
                    {project.name}
                  </h3>
                  <p className="text-gray-700 mt-1 leading-relaxed">
                    {project.description}
                  </p>
                  {project.technologies && project.technologies.length > 0 && (
                    <p className="text-gray-600 text-sm mt-2">
                      <span className="font-semibold">Technologies:</span>{" "}
                      {project.technologies.join(" • ")}
                    </p>
                  )}
                  {project.url && (
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-800 hover:text-gray-600 text-sm mt-1 inline-block underline"
                    >
                      View Project
                    </a>
                  )}
                  {index < cvData.projects.length - 1 && (
                    <hr className="border-t border-gray-300 mt-4" />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Additional Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Certificates */}
          {cvData.certificates.length > 0 && (
            <section className="print:break-inside-avoid">
              <h2 className="text-xl font-bold text-gray-900 mb-3 uppercase tracking-widest font-serif border-b-2 border-gray-900 pb-1">
                Certifications
              </h2>
              <div className="border-l-4 border-gray-300 pl-4 mt-3">
                <ul className="space-y-1">
                  {cvData.certificates.map((cert, index) => (
                    <li key={index} className="text-gray-700">
                      • {cert}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Languages */}
          {cvData.languages.length > 0 && (
            <section className="print:break-inside-avoid">
              <h2 className="text-xl font-bold text-gray-900 mb-3 uppercase tracking-widest font-serif border-b-2 border-gray-900 pb-1">
                Languages
              </h2>
              <div className="border-l-4 border-gray-300 pl-4 mt-3">
                <div className="space-y-2">
                  {cvData.languages.map((lang, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-gray-800 font-semibold">
                        {lang.language}
                      </span>
                      <span className="text-gray-600">{lang.proficiency}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )

  const CompactTemplate = () => (
    <div className="bg-white text-sm print:text-xs leading-tight">
      {/* Header */}
      <div className="bg-gray-50 p-3 border-b-2 border-gray-300">
        <h1 className="text-xl font-black text-gray-900 mb-1 print:text-lg">
          {cvData.personalInfo.name.toUpperCase()}
        </h1>
        <div className="flex flex-wrap gap-3 text-gray-700 text-xs">
          {cvData.personalInfo.email && (
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {cvData.personalInfo.email}
            </span>
          )}
          {cvData.personalInfo.phone && (
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {cvData.personalInfo.phone}
            </span>
          )}
          {cvData.personalInfo.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {cvData.personalInfo.location}
            </span>
          )}
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Summary */}
        {cvData.summary && (
          <section className="print:break-inside-avoid">
            <h2 className="text-xs font-black text-gray-900 mb-1 uppercase tracking-wide border-b border-gray-400 pb-0.5">
              Profile
            </h2>
            <p className="text-gray-800 text-xs leading-snug">
              {cvData.summary}
            </p>
          </section>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 print:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-3">
            {/* Experience */}
            {cvData.experience.length > 0 && (
              <section className="print:break-inside-avoid">
                <h2 className="text-xs font-black text-gray-900 mb-1 uppercase tracking-wide border-b border-gray-400 pb-0.5 flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  Experience
                </h2>
                <div className="space-y-2">
                  {cvData.experience.map((exp, index) => (
                    <div
                      key={index}
                      className="text-xs print:break-inside-avoid"
                    >
                      <div className="flex justify-between items-start mb-0.5">
                        <h3 className="font-bold text-gray-900 leading-none flex-1 pr-1">
                          {exp.title}
                        </h3>
                        <span className="text-gray-600 text-[10px] bg-gray-100 px-1 rounded whitespace-nowrap">
                          {formatDate(exp.start, exp.end)}
                        </span>
                      </div>
                      <p className="text-gray-700 font-semibold text-[11px] mb-1">
                        {exp.company}
                      </p>
                      {exp.location && (
                        <p className="text-gray-600 text-[10px] mb-1">
                          {exp.location}
                        </p>
                      )}
                      {exp.bullets && exp.bullets.length > 0 && (
                        <ul className="list-disc list-inside mt-1 space-y-0 ml-2">
                          {exp.bullets
                            .slice(0, 2)
                            .map((bullet, bulletIndex) => (
                              <li
                                key={bulletIndex}
                                className="text-gray-800 leading-tight text-[10px]"
                              >
                                {bullet}
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Projects */}
            {cvData.projects.length > 0 && (
              <section className="print:break-inside-avoid">
                <h2 className="text-xs font-black text-gray-900 mb-1 uppercase tracking-wide border-b border-gray-400 pb-0.5 flex items-center gap-1">
                  <FolderOpen className="w-3 h-3" />
                  Key Projects
                </h2>
                <div className="space-y-2">
                  {cvData.projects.slice(0, 3).map((project, index) => (
                    <div
                      key={index}
                      className="text-xs print:break-inside-avoid"
                    >
                      <h3 className="font-bold text-gray-900 text-[11px]">
                        {project.name}
                      </h3>
                      <p className="text-gray-700 leading-tight text-[10px] mt-0.5">
                        {project.description}
                      </p>
                      {project.technologies &&
                        project.technologies.length > 0 && (
                          <p className="text-gray-600 text-[9px] mt-0.5">
                            {project.technologies.slice(0, 4).join(" • ")}
                          </p>
                        )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-3">
            {/* Education */}
            {cvData.education.length > 0 && (
              <section className="print:break-inside-avoid">
                <h2 className="text-xs font-black text-gray-900 mb-1 uppercase tracking-wide border-b border-gray-400 pb-0.5 flex items-center gap-1">
                  <GraduationCap className="w-3 h-3" />
                  Education
                </h2>
                <div className="space-y-1.5">
                  {cvData.education.map((edu, index) => (
                    <div
                      key={index}
                      className="text-xs print:break-inside-avoid"
                    >
                      <h3 className="font-bold text-gray-900 text-[11px] leading-tight">
                        {edu.degree}
                      </h3>
                      <p className="text-gray-700 text-[10px]">
                        {edu.institution}
                      </p>
                      <div className="flex justify-between items-center">
                        {edu.location && (
                          <p className="text-gray-600 text-[9px]">
                            {edu.location}
                          </p>
                        )}
                        <span className="text-gray-500 text-[9px] bg-gray-100 px-1 rounded">
                          {formatDate(edu.start, edu.end)}
                        </span>
                      </div>
                      {edu.gpa && (
                        <p className="text-gray-600 text-[9px]">
                          GPA: {edu.gpa}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Skills */}
            {cvData.skills.length > 0 && (
              <section className="print:break-inside-avoid">
                <h2 className="text-xs font-black text-gray-900 mb-1 uppercase tracking-wide border-b border-gray-400 pb-0.5 flex items-center gap-1">
                  <Code className="w-3 h-3" />
                  Skills
                </h2>
                <div className="text-xs">
                  {Object.entries(
                    cvData.skills.reduce((acc, skill) => {
                      if (!acc[skill.category]) acc[skill.category] = []
                      acc[skill.category].push(skill.name)
                      return acc
                    }, {} as Record<string, string[]>)
                  ).map(([category, skills]) => (
                    <div key={category} className="mb-1">
                      <span className="font-bold text-gray-900 text-[10px]">
                        {category}:
                      </span>
                      <br />
                      <span className="text-gray-700 text-[9px] leading-tight">
                        {skills.join(" • ")}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Languages */}
            {cvData.languages.length > 0 && (
              <section className="print:break-inside-avoid">
                <h2 className="text-xs font-black text-gray-900 mb-1 uppercase tracking-wide border-b border-gray-400 pb-0.5 flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  Languages
                </h2>
                <div className="text-xs space-y-0.5">
                  {cvData.languages.map((lang, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center"
                    >
                      <span className="text-gray-900 font-semibold text-[10px]">
                        {lang.language}
                      </span>
                      <span className="text-gray-600 text-[9px] bg-gray-100 px-1 rounded">
                        {lang.proficiency}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Certificates */}
            {cvData.certificates.length > 0 && (
              <section className="print:break-inside-avoid">
                <h2 className="text-xs font-black text-gray-900 mb-1 uppercase tracking-wide border-b border-gray-400 pb-0.5 flex items-center gap-1">
                  <Award className="w-3 h-3" />
                  Certifications
                </h2>
                <ul className="text-xs space-y-0">
                  {cvData.certificates.slice(0, 4).map((cert, index) => (
                    <li
                      key={index}
                      className="text-gray-700 text-[9px] leading-tight"
                    >
                      • {cert}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  const renderTemplate = () => {
    switch (activeTemplate) {
      case "modern":
        return <ModernTemplate />
      case "classic":
        return <ClassicTemplate />
      case "compact":
        return <CompactTemplate />
      default:
        return <ModernTemplate />
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Template Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {(["modern", "classic", "compact"] as TemplateType[]).map(
          (template) => (
            <button
              key={template}
              onClick={() => setActiveTemplate(template)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTemplate === template
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {template.charAt(0).toUpperCase() + template.slice(1)}
            </button>
          )
        )}
      </div>

      {/* Preview Content */}
      <Card className="overflow-hidden p-0">
        <div
          className="w-full max-w-4xl mx-auto bg-white overflow-auto print:overflow-visible print:max-w-none"
          style={{
            aspectRatio: "210/297", // A4 aspect ratio
            minHeight: "297mm",
            maxHeight: "80vh"
          }}
        >
          <div className="transform scale-75 origin-top-left w-[133.33%] h-[133.33%] print:scale-100 print:w-full print:h-full print:transform-none">
            {renderTemplate()}
          </div>
        </div>
      </Card>
    </div>
  )
}

export default PreviewPane
