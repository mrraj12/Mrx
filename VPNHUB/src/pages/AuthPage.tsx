import React from 'react';
import AuthComponent from '../components/AuthPage';

interface AuthPageProps {
  darkMode: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string, fullName: string, phone: string) => Promise<void>;
}

export default function AuthPage({ darkMode, onLogin, onSignUp }: AuthPageProps) {
  return (
    <AuthComponent
      darkMode={darkMode}
      onLogin={onLogin}
      onSignUp={onSignUp}
    />
  );
}