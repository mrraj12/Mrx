import React from 'react';

interface HeaderProps {
  darkMode: boolean;
}

export default function Header({ darkMode }: HeaderProps) {
  return (
    <header
      className={`${
        darkMode
          ? 'bg-gradient-to-r from-purple-900 via-blue-800 to-indigo-900'
          : 'bg-gradient-to-r from-purple-300 via-blue-300 to-indigo-300'
      } py-20 px-4 transition-all duration-300`}
    >
      <div className="max-w-6xl mx-auto text-center">
        <h1
          className={`text-4xl md:text-5xl lg:text-6xl font-bold mb-6 ${
            darkMode ? 'text-white' : 'text-gray-800'
          } transition-colors duration-300`}
        >
          Secure Your Online Privacy with Our VPN
        </h1>

        <p
          className={`text-lg md:text-xl lg:text-2xl max-w-4xl mx-auto leading-relaxed ${
            darkMode ? 'text-gray-200' : 'text-gray-700'
          } transition-colors duration-300`}
        >
          Choose the plan that fits your needs and experience seamless, secure browsing.
          Enjoy fast speeds, and robust security features.
        </p>
      </div>
    </header>
  );
}