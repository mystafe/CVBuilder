import React, { useState } from "react"
import { CVData } from "../lib/flow"
import { Card } from "./ui"

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

  const formatDate = (start: string, end: string) => {
    if (!start && !end) return ""
    if (end === "Present" || end === "Current") return `${start} - Present`
    return `${start} - ${end}`
  }

  const ModernTemplate = () => (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden print:shadow-none print:rounded-none">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-8 print:bg-blue-700">
        <h1 className="text-4xl font-bold mb-2 print:text-3xl">
          {cvData.personalInfo.name}
        </h1>
        <div className="flex flex-wrap gap-4 text-blue-100">
          {cvData.personalInfo.email && (
            <span className="flex items-center gap-1">
              <span>📧</span> {cvData.personalInfo.email}
            </span>
          )}
          {cvData.personalInfo.phone && (
            <span className="flex items-center gap-1">
              <span>📞</span> {cvData.personalInfo.phone}
            </span>
          )}
          {cvData.personalInfo.location && (
            <span className="flex items-center gap-1">
              <span>📍</span> {cvData.personalInfo.location}
            </span>
          )}
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* Summary */}
        {cvData.summary && (
          <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-blue-200 pb-2">
              Professional Summary
            </h2>
            <p className="text-gray-700 leading-relaxed">{cvData.summary}</p>
          </section>
        )}

        {/* Experience */}
        {cvData.experience.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-blue-200 pb-2">
              Professional Experience
            </h2>
            <div className="space-y-6">
              {cvData.experience.map((exp, index) => (
                <div key={index} className="border-l-4 border-blue-200 pl-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800">
                        {exp.title}
                      </h3>
                      <p className="text-lg text-blue-600 font-medium">
                        {exp.company}
                      </p>
                      {exp.location && (
                        <p className="text-gray-600">{exp.location}</p>
                      )}
                    </div>
                    <span className="text-gray-500 font-medium whitespace-nowrap ml-4">
                      {formatDate(exp.start, exp.end)}
                    </span>
                  </div>
                  {exp.bullets && exp.bullets.length > 0 && (
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {exp.bullets.map((bullet, bulletIndex) => (
                        <li key={bulletIndex} className="leading-relaxed">
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
          <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-blue-200 pb-2">
              Education
            </h2>
            <div className="space-y-4">
              {cvData.education.map((edu, index) => (
                <div key={index} className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {edu.degree}
                    </h3>
                    <p className="text-blue-600 font-medium">
                      {edu.institution}
                    </p>
                    {edu.location && (
                      <p className="text-gray-600">{edu.location}</p>
                    )}
                    {edu.gpa && <p className="text-gray-700">GPA: {edu.gpa}</p>}
                  </div>
                  <span className="text-gray-500 font-medium whitespace-nowrap ml-4">
                    {formatDate(edu.start, edu.end)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Skills */}
        {cvData.skills.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-blue-200 pb-2">
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
          <section>
            <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-blue-200 pb-2">
              Projects
            </h2>
            <div className="space-y-4">
              {cvData.projects.map((project, index) => (
                <div key={index}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {project.name}
                    </h3>
                    {project.start && project.end && (
                      <span className="text-gray-500 font-medium whitespace-nowrap ml-4">
                        {formatDate(project.start, project.end)}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 mb-2">{project.description}</p>
                  {project.technologies && project.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {project.technologies.map((tech, techIndex) => (
                        <span
                          key={techIndex}
                          className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm"
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
                      className="text-blue-600 hover:underline text-sm mt-2 inline-block"
                    >
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
            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3 border-b border-blue-200 pb-1">
                Certificates
              </h2>
              <ul className="space-y-1">
                {cvData.certificates.map((cert, index) => (
                  <li key={index} className="text-gray-700">
                    {cert}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Languages */}
          {cvData.languages.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3 border-b border-blue-200 pb-1">
                Languages
              </h2>
              <div className="space-y-2">
                {cvData.languages.map((lang, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="text-gray-800">{lang.language}</span>
                    <span className="text-gray-600">{lang.proficiency}</span>
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
    <div className="bg-white border border-gray-300 print:border-none">
      {/* Header */}
      <div className="border-b-2 border-gray-800 p-6 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          {cvData.personalInfo.name}
        </h1>
        <div className="flex justify-center gap-6 text-gray-600 text-sm">
          {cvData.personalInfo.email && (
            <span>{cvData.personalInfo.email}</span>
          )}
          {cvData.personalInfo.phone && (
            <span>{cvData.personalInfo.phone}</span>
          )}
          {cvData.personalInfo.location && (
            <span>{cvData.personalInfo.location}</span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Summary */}
        {cvData.summary && (
          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2 uppercase tracking-wider">
              Objective
            </h2>
            <hr className="border-gray-400 mb-3" />
            <p className="text-gray-700 text-justify">{cvData.summary}</p>
          </section>
        )}

        {/* Experience */}
        {cvData.experience.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2 uppercase tracking-wider">
              Experience
            </h2>
            <hr className="border-gray-400 mb-3" />
            <div className="space-y-4">
              {cvData.experience.map((exp, index) => (
                <div key={index}>
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-bold text-gray-800">{exp.title}</h3>
                    <span className="text-gray-600 text-sm">
                      {formatDate(exp.start, exp.end)}
                    </span>
                  </div>
                  <p className="text-gray-700 font-medium italic mb-2">
                    {exp.company}
                    {exp.location && `, ${exp.location}`}
                  </p>
                  {exp.bullets && exp.bullets.length > 0 && (
                    <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                      {exp.bullets.map((bullet, bulletIndex) => (
                        <li key={bulletIndex}>{bullet}</li>
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
          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2 uppercase tracking-wider">
              Education
            </h2>
            <hr className="border-gray-400 mb-3" />
            <div className="space-y-3">
              {cvData.education.map((edu, index) => (
                <div key={index}>
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-bold text-gray-800">{edu.degree}</h3>
                    <span className="text-gray-600 text-sm">
                      {formatDate(edu.start, edu.end)}
                    </span>
                  </div>
                  <p className="text-gray-700 italic">
                    {edu.institution}
                    {edu.location && `, ${edu.location}`}
                  </p>
                  {edu.gpa && (
                    <p className="text-gray-700 text-sm">GPA: {edu.gpa}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Skills */}
        {cvData.skills.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2 uppercase tracking-wider">
              Skills
            </h2>
            <hr className="border-gray-400 mb-3" />
            {Object.entries(
              cvData.skills.reduce((acc, skill) => {
                if (!acc[skill.category]) acc[skill.category] = []
                acc[skill.category].push(skill.name)
                return acc
              }, {} as Record<string, string[]>)
            ).map(([category, skills]) => (
              <div key={category} className="mb-2">
                <span className="font-semibold text-gray-800">
                  {category}:{" "}
                </span>
                <span className="text-gray-700">{skills.join(", ")}</span>
              </div>
            ))}
          </section>
        )}

        {/* Other sections in classic style */}
        {cvData.projects.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2 uppercase tracking-wider">
              Projects
            </h2>
            <hr className="border-gray-400 mb-3" />
            <div className="space-y-3">
              {cvData.projects.map((project, index) => (
                <div key={index}>
                  <h3 className="font-bold text-gray-800">{project.name}</h3>
                  <p className="text-gray-700 text-sm">{project.description}</p>
                  {project.technologies && project.technologies.length > 0 && (
                    <p className="text-gray-600 text-sm">
                      <span className="font-medium">Technologies:</span>{" "}
                      {project.technologies.join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )

  const CompactTemplate = () => (
    <div className="bg-white text-sm print:text-xs">
      {/* Header */}
      <div className="bg-gray-100 p-4 border-b">
        <h1 className="text-2xl font-bold text-gray-800">
          {cvData.personalInfo.name}
        </h1>
        <div className="flex gap-4 text-gray-600 mt-1">
          {cvData.personalInfo.email && (
            <span>{cvData.personalInfo.email}</span>
          )}
          {cvData.personalInfo.phone && (
            <span>{cvData.personalInfo.phone}</span>
          )}
          {cvData.personalInfo.location && (
            <span>{cvData.personalInfo.location}</span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary */}
        {cvData.summary && (
          <section>
            <h2 className="text-sm font-bold text-gray-800 mb-1">SUMMARY</h2>
            <p className="text-gray-700 text-xs leading-tight">
              {cvData.summary}
            </p>
          </section>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Experience */}
            {cvData.experience.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-gray-800 mb-1">
                  EXPERIENCE
                </h2>
                <div className="space-y-2">
                  {cvData.experience.map((exp, index) => (
                    <div key={index} className="text-xs">
                      <div className="flex justify-between">
                        <h3 className="font-semibold text-gray-800">
                          {exp.title}
                        </h3>
                        <span className="text-gray-500">
                          {formatDate(exp.start, exp.end)}
                        </span>
                      </div>
                      <p className="text-gray-600 font-medium">{exp.company}</p>
                      {exp.bullets && exp.bullets.length > 0 && (
                        <ul className="list-disc list-inside mt-1 space-y-0">
                          {exp.bullets
                            .slice(0, 2)
                            .map((bullet, bulletIndex) => (
                              <li
                                key={bulletIndex}
                                className="text-gray-700 leading-tight"
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
              <section>
                <h2 className="text-sm font-bold text-gray-800 mb-1">
                  PROJECTS
                </h2>
                <div className="space-y-2">
                  {cvData.projects.slice(0, 3).map((project, index) => (
                    <div key={index} className="text-xs">
                      <h3 className="font-semibold text-gray-800">
                        {project.name}
                      </h3>
                      <p className="text-gray-700 leading-tight">
                        {project.description}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Education */}
            {cvData.education.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-gray-800 mb-1">
                  EDUCATION
                </h2>
                <div className="space-y-2">
                  {cvData.education.map((edu, index) => (
                    <div key={index} className="text-xs">
                      <h3 className="font-semibold text-gray-800">
                        {edu.degree}
                      </h3>
                      <p className="text-gray-600">{edu.institution}</p>
                      <p className="text-gray-500">
                        {formatDate(edu.start, edu.end)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Skills */}
            {cvData.skills.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-gray-800 mb-1">SKILLS</h2>
                <div className="text-xs">
                  {Object.entries(
                    cvData.skills.reduce((acc, skill) => {
                      if (!acc[skill.category]) acc[skill.category] = []
                      acc[skill.category].push(skill.name)
                      return acc
                    }, {} as Record<string, string[]>)
                  ).map(([category, skills]) => (
                    <div key={category} className="mb-1">
                      <span className="font-semibold text-gray-800">
                        {category}:
                      </span>
                      <span className="text-gray-700 ml-1">
                        {skills.join(", ")}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Languages */}
            {cvData.languages.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-gray-800 mb-1">
                  LANGUAGES
                </h2>
                <div className="text-xs space-y-1">
                  {cvData.languages.map((lang, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-gray-800">{lang.language}</span>
                      <span className="text-gray-600">{lang.proficiency}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Certificates */}
            {cvData.certificates.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-gray-800 mb-1">
                  CERTIFICATES
                </h2>
                <ul className="text-xs space-y-0">
                  {cvData.certificates.map((cert, index) => (
                    <li key={index} className="text-gray-700">
                      {cert}
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
          className="w-full max-w-4xl mx-auto bg-white overflow-auto"
          style={{
            aspectRatio: "210/297", // A4 aspect ratio
            minHeight: "297mm",
            maxHeight: "80vh"
          }}
        >
          <div className="transform scale-75 origin-top-left w-[133.33%] h-[133.33%] print:scale-100 print:w-full print:h-full">
            {renderTemplate()}
          </div>
        </div>
      </Card>
    </div>
  )
}

export default PreviewPane
