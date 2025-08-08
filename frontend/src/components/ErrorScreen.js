import React from 'react';

export default function ErrorScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
      <p>Please refresh the page.</p>
    </div>
  );
}
