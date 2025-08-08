import React from 'react';

export default function SkillsBlock({ skills, label }) {
  if (!skills.length) return null;
  return (
    <div>
      <h2 className="text-xl font-semibold">{label}</h2>
      <ul className="list-disc pl-5 space-y-1">
        {skills.map((skill, idx) => (
          <li key={idx}>{skill.name || skill}</li>
        ))}
      </ul>
    </div>
  );
}
