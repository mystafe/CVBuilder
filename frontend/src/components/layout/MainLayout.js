import React from 'react';
import Content from './Content';
import Sidebar from './Sidebar';

export default function MainLayout({ children, sidebar }) {
  return (
    <div className="flex">
      <Content>{children}</Content>
      <Sidebar>{sidebar}</Sidebar>
    </div>
  );
}
