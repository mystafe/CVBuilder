import React from 'react';

export default function PersonalBlock({ personal }) {
  if (!personal.name) return null;
  return (
    <div>
      <h1 className="text-2xl font-bold">{personal.name}</h1>
      {personal.email && <p>{personal.email}</p>}
      {personal.phone && <p>{personal.phone}</p>}
      {personal.location && <p>{personal.location}</p>}
    </div>
  );
}
