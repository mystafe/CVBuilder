import React from 'react';

export default function Sidebar({ children }) {
  return <aside className="w-1/2 p-4 border-l overflow-y-auto">{children}</aside>;
}
