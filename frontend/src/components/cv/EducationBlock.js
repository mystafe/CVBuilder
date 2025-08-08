import React from 'react';

export default function EducationBlock({ education, label }) {
  if (!education.length) return null;
  return (
    <div>
      <h2 className="text-xl font-semibold">{label}</h2>
      {education.map((edu, idx) => (
        <div key={idx} className="mb-2">
          <p className="font-medium">{edu.degree}</p>
          {edu.institution && <p className="text-sm text-gray-500">{edu.institution}</p>}
          {edu.date && <p className="text-sm text-gray-500">{edu.date}</p>}
        </div>
      ))}
    </div>
  );
}
