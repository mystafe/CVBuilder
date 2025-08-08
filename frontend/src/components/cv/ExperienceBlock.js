import React from 'react';

export default function ExperienceBlock({ experience, label }) {
  if (!experience.length) return null;
  return (
    <div>
      <h2 className="text-xl font-semibold">{label}</h2>
      {experience.map((exp, idx) => (
        <div key={idx} className="mb-2">
          <p className="font-medium">{exp.title} {exp.company && `- ${exp.company}`}</p>
          {exp.date && <p className="text-sm text-gray-500">{exp.date}</p>}
          {exp.description && <p className="text-sm whitespace-pre-line">{exp.description}</p>}
        </div>
      ))}
    </div>
  );
}
