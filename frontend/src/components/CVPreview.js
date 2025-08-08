import React from 'react';

function CVPreview({ data }) {
  const { personal, experience, education, skills } = data;
  return (
    <div className="space-y-4">
      {personal.name && (
        <div>
          <h1 className="text-2xl font-bold">{personal.name}</h1>
          {personal.email && <p>{personal.email}</p>}
          {personal.phone && <p>{personal.phone}</p>}
          {personal.location && <p>{personal.location}</p>}
        </div>
      )}
      {experience.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold">Experience</h2>
          {experience.map((exp, idx) => (
            <div key={idx} className="mb-2">
              <p className="font-medium">{exp.title} {exp.company && `- ${exp.company}`}</p>
              {exp.date && <p className="text-sm text-gray-500">{exp.date}</p>}
              {exp.description && <p className="text-sm whitespace-pre-line">{exp.description}</p>}
            </div>
          ))}
        </div>
      )}
      {education.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold">Education</h2>
          {education.map((edu, idx) => (
            <div key={idx} className="mb-2">
              <p className="font-medium">{edu.degree}</p>
              {edu.institution && <p className="text-sm text-gray-500">{edu.institution}</p>}
              {edu.date && <p className="text-sm text-gray-500">{edu.date}</p>}
            </div>
          ))}
        </div>
      )}
      {skills.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold">Skills</h2>
          <ul className="list-disc pl-5 space-y-1">
            {skills.map((skill, idx) => (
              <li key={idx}>{skill.name || skill}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default CVPreview;
