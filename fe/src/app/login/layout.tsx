import React from 'react';
// import type { Metadata } from 'next'; // Removed Metadata import

// Removed metadata export
// export const metadata: Metadata = { ... };

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* <head> tag removed */}
      {/* Render the page content */}
      {children}
    </>
  );
} 