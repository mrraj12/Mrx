import React from 'react';
import BlogLanding from '../components/BlogLanding';

interface HomePageProps {
  darkMode: boolean;
  onSignUp: (email: string, password: string, fullName: string, phone: string) => Promise<void>;
  onShowAuth: () => void;
  onToggleDarkMode?: () => void;
}

export default function HomePage({
  darkMode,
  onSignUp,
  onShowAuth,
  onToggleDarkMode
}: HomePageProps) {
  return (
    <BlogLanding
      darkMode={darkMode}
      onSignUp={onSignUp}
      onShowAuth={onShowAuth}
      onToggleDarkMode={onToggleDarkMode}
    />
  );
}