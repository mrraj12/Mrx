import React, { useState, useEffect } from 'react';
import {
  Shield,
  Zap,
  Globe,
  Lock,
  Eye,
  EyeOff,
  Mail,
  User,
  Phone,
  X,
  Clock,
  Moon,
  Sun
} from 'lucide-react';
import toast from 'react-hot-toast';

interface BlogLandingProps {
  darkMode: boolean;
  onSignUp: (email: string, password: string, fullName: string, phone: string) => Promise<void>;
  onShowAuth: () => void;
  onToggleDarkMode?: () => void;
}

interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  readTime: string;
  category: string;
  author: string;
  publishDate: string;
  image: string;
}

export default function BlogLanding({
  darkMode,
  onSignUp,
  onShowAuth,
  onToggleDarkMode
}: BlogLandingProps) {
  const [showSignUpPopup, setShowSignUpPopup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hideHeader, setHideHeader] = useState(false);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: ''
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSignUpPopup(false);
    }, 60000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setHideHeader(window.scrollY > 30);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password || !formData.fullName || !formData.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);

    try {
      await onSignUp(formData.email, formData.password, formData.fullName, formData.phone);

      toast.success('Account created successfully! Please verify your email.', {
        duration: 6000,
        style: {
          background: '#10B981',
          color: 'white',
          fontSize: '16px',
          padding: '16px',
          borderRadius: '8px'
        }
      });

      setShowSignUpPopup(false);
      setFormData({ email: '', password: '', fullName: '', phone: '' });
    } catch (error: any) {
      toast.error(error.message || 'Sign up failed');
    } finally {
      setIsLoading(false);
    }
  };

  const blogPosts: BlogPost[] = [
    {
      id: 1,
      title: 'Why VPN Security Matters More Than Ever in 2025',
      excerpt:
        'With increasing cyber threats and privacy concerns, protecting your online identity has become crucial. Learn how VPNs provide essential security layers.',
      content: `
        <p>In today's digital landscape, online privacy and security have become more critical than ever. With cyber threats evolving rapidly and data breaches making headlines daily, protecting your digital footprint is no longer optional—it's essential.</p>

        <h3>The Growing Threat Landscape</h3>
        <p>Cybercriminals are becoming increasingly sophisticated, targeting everything from personal data to financial information. Public Wi-Fi networks, once convenient, are now hunting grounds for hackers looking to intercept sensitive information.</p>

        <h3>How VPNs Provide Protection</h3>
        <p>Virtual Private Networks create an encrypted tunnel between your device and the internet, making it virtually impossible for third parties to intercept your data. This military-grade encryption ensures that your browsing habits, personal information, and communications remain private.</p>

        <h3>Beyond Security: Privacy in the Digital Age</h3>
        <p>ISPs, advertisers, and even governments are increasingly monitoring online activities. A VPN masks your IP address and location, giving you back control over your digital privacy and allowing you to browse the internet as it was meant to be—free and open.</p>
      `,
      readTime: '5 min read',
      category: 'Security',
      author: 'Security Expert',
      publishDate: 'January 15, 2025',
      image:
        'https://images.pexels.com/photos/60504/security-protection-anti-virus-software-60504.jpeg?auto=compress&cs=tinysrgb&w=800'
    },
    {
      id: 2,
      title: 'Streaming Without Borders: Unlock Global Content',
      excerpt:
        'Access your favorite shows and movies from anywhere in the world. Discover how VPNs break down geographical barriers for entertainment.',
      content: `
        <p>Geographic restrictions on streaming content have become one of the most frustrating aspects of modern entertainment. Your favorite show might be available in one country but blocked in another, creating an uneven playing field for global audiences.</p>

        <h3>Understanding Geo-Blocking</h3>
        <p>Streaming services use geo-blocking technology to restrict content based on your location. This is often due to licensing agreements, regional regulations, or content distribution rights that vary by country.</p>

        <h3>VPNs: Your Passport to Global Entertainment</h3>
        <p>By connecting to VPN servers in different countries, you can virtually relocate yourself and access content libraries from around the world. Whether it's Netflix US, BBC iPlayer, or regional sports broadcasts, a VPN opens doors to unlimited entertainment.</p>

        <h3>Choosing the Right Server</h3>
        <p>Different streaming services have varying levels of VPN detection. Premium VPN services maintain dedicated streaming servers that are optimized for speed and reliability, ensuring smooth playback without buffering.</p>
      `,
      readTime: '4 min read',
      category: 'Streaming',
      author: 'Entertainment Specialist',
      publishDate: 'January 12, 2025',
      image:
        'https://images.pexels.com/photos/4009402/pexels-photo-4009402.jpeg?auto=compress&cs=tinysrgb&w=800'
    },
    {
      id: 3,
      title: 'Remote Work Security: Protecting Your Business Data',
      excerpt:
        'As remote work becomes the norm, securing business communications and data transfer is paramount. Learn enterprise VPN best practices.',
      content: `
        <p>The shift to remote work has fundamentally changed how businesses operate, but it has also introduced new security challenges. With employees accessing company resources from various locations and networks, traditional security perimeters no longer exist.</p>

        <h3>The Remote Work Security Challenge</h3>
        <p>Home networks, coffee shop Wi-Fi, and mobile hotspots lack the security infrastructure of corporate networks. This creates vulnerabilities that cybercriminals are eager to exploit, putting sensitive business data at risk.</p>

        <h3>Enterprise VPN Solutions</h3>
        <p>Business-grade VPNs provide secure tunnels for remote employees to access company resources safely. These solutions offer features like multi-factor authentication, centralized management, and detailed logging for compliance requirements.</p>

        <h3>Best Practices for Business VPN Usage</h3>
        <p>Implementing a successful VPN strategy requires proper planning, employee training, and regular security audits. Companies should establish clear policies for VPN usage and ensure all remote workers understand the importance of maintaining secure connections.</p>
      `,
      readTime: '6 min read',
      category: 'Business',
      author: 'IT Security Consultant',
      publishDate: 'January 10, 2025',
      image:
        'https://images.pexels.com/photos/4226140/pexels-photo-4226140.jpeg?auto=compress&cs=tinysrgb&w=800'
    }
  ];

  const features = [
    {
      icon: Shield,
      title: 'Military-Grade Encryption',
      description: 'AES-256 encryption protects your data from hackers and surveillance'
    },
    {
      icon: Zap,
      title: 'Lightning Fast Speeds',
      description: 'Optimized servers ensure minimal impact on your browsing experience'
    },
    {
      icon: Globe,
      title: 'Global Server Network',
      description: 'Access content from 50+ countries with our worldwide server locations'
    },
    {
      icon: Lock,
      title: 'Zero-Log Policy',
      description: 'We never track, collect, or share your private data'
    }
  ];

  if (selectedPost) {
    return (
      <div
        className={`min-h-screen transition-all duration-300 ${
          darkMode
            ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900'
            : 'bg-gradient-to-br from-gray-50 via-purple-50 to-blue-50'
        }`}
      >
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button
            onClick={() => setSelectedPost(null)}
            className={`flex items-center space-x-2 mb-8 px-4 py-2 rounded-lg transition-colors ${
              darkMode
                ? 'text-purple-400 hover:text-purple-300 hover:bg-gray-800'
                : 'text-purple-600 hover:text-purple-700 hover:bg-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Home</span>
          </button>

          <article
            className={`rounded-2xl overflow-hidden shadow-2xl ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}
          >
            <img
              src={selectedPost.image}
              alt={selectedPost.title}
              className="w-full h-64 md:h-96 object-cover"
            />

            <div className="p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <span
                  className={`w-fit px-3 py-1 rounded-full text-sm font-semibold ${
                    darkMode
                      ? 'bg-purple-900/50 text-purple-300'
                      : 'bg-purple-100 text-purple-600'
                  }`}
                >
                  {selectedPost.category}
                </span>

                <div
                  className={`flex flex-wrap items-center gap-4 text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  <span className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {selectedPost.readTime}
                  </span>
                  <span className="flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    {selectedPost.author}
                  </span>
                </div>
              </div>

              <h1
                className={`text-3xl md:text-4xl font-bold mb-4 ${
                  darkMode ? 'text-white' : 'text-gray-800'
                }`}
              >
                {selectedPost.title}
              </h1>

              <p className={`text-lg mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {selectedPost.publishDate}
              </p>

              <div
                className={`prose prose-lg max-w-none article-content ${
                  darkMode ? 'prose-invert' : ''
                }`}
                style={
                  {
                    '--tw-prose-headings': darkMode ? '#ffffff' : '#1f2937',
                    '--tw-prose-body': darkMode ? '#ffffff' : '#374151',
                    '--tw-prose-bold': darkMode ? '#ffffff' : '#1f2937'
                  } as React.CSSProperties
                }
                dangerouslySetInnerHTML={{ __html: selectedPost.content }}
              />

              <style>{`
                .article-content h3 {
                  font-weight: bold !important;
                  color: ${darkMode ? '#ffffff' : '#1f2937'} !important;
                }
                .article-content p {
                  color: ${darkMode ? '#ffffff' : '#374151'} !important;
                }
              `}</style>
            </div>
          </article>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen transition-all duration-300 ${
        darkMode
          ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900'
          : 'bg-gradient-to-br from-gray-50 via-purple-50 to-blue-50'
      }`}
    >
      {/* Header */}
      <header
        className={`sticky top-0 z-50 px-3 sm:px-4 pt-3 max-[360px]:pt-[11px] transition-transform duration-300 md:translate-y-0 ${
          hideHeader ? '-translate-y-full md:translate-y-0' : 'translate-y-0'
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <div
            className={`h-[58px] max-[360px]:h-[56px] sm:h-16 rounded-[1.7rem] sm:rounded-[2rem] border backdrop-blur-xl shadow-2xl flex items-center justify-between px-3 sm:px-6 transition-all duration-300 ${
              darkMode
                ? 'bg-gray-900/45 border-white/10 shadow-purple-950/30'
                : 'bg-white/65 border-white/60 shadow-purple-200/30'
            }`}
          >
            {/* Brand */}
            <a
              href="https://vpnhub.uk/"
              className="group flex items-center gap-2 sm:gap-3 min-w-0"
              aria-label="Go to VPNHUB homepage"
            >
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                  darkMode
                    ? 'text-purple-300 group-hover:bg-white/10'
                    : 'text-purple-700 group-hover:bg-purple-100'
                }`}
              >
                <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>

              <span
                className={`text-base sm:text-2xl font-black tracking-tight truncate transition-colors duration-300 ${
                  darkMode
                    ? 'text-white group-hover:text-purple-300'
                    : 'text-gray-950 group-hover:text-purple-700'
                }`}
              >
                VPNHUB
              </span>
            </a>

            {/* Theme Toggle + Get Started */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={onToggleDarkMode}
                disabled={!onToggleDarkMode}
                aria-label="Toggle dark mode"
                className={`w-[42px] h-[42px] max-[360px]:w-10 max-[360px]:h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center border transition-all duration-300 shrink-0 ${
                  darkMode
                    ? 'bg-white/10 border-white/10 text-yellow-300 hover:bg-white/20'
                    : 'bg-black/5 border-black/10 text-purple-700 hover:bg-black/10'
                } ${!onToggleDarkMode ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {darkMode ? (
                  <Sun className="w-5 h-5 max-[360px]:w-4 max-[360px]:h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Moon className="w-5 h-5 max-[360px]:w-4 max-[360px]:h-4 sm:w-5 sm:h-5" />
                )}
              </button>

              <button
                onClick={() => setShowSignUpPopup(true)}
                className="h-[42px] max-[360px]:h-10 rounded-full px-3 max-[360px]:px-2.5 sm:px-5 text-xs sm:text-base font-bold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/30 active:scale-95 transition-all duration-300 whitespace-nowrap"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1
            className={`text-4xl md:text-6xl font-bold mb-6 ${
              darkMode ? 'text-white' : 'text-gray-800'
            }`}
          >
            Your Privacy,{' '}
            <span className={`${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
              Protected
            </span>
          </h1>

          <p
            className={`text-xl md:text-2xl mb-8 max-w-3xl mx-auto ${
              darkMode ? 'text-gray-300' : 'text-gray-600'
            }`}
          >
            Discover the latest insights on digital privacy, security, and how VPNs are reshaping
            the way we browse the internet safely.
          </p>

          <button
            onClick={() => setShowSignUpPopup(true)}
            className="px-8 py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-lg"
          >
            Start Your Secure Journey
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2
            className={`text-3xl md:text-4xl font-bold text-center mb-12 ${
              darkMode ? 'text-white' : 'text-gray-800'
            }`}
          >
            Why Choose VPNHUB?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`p-6 rounded-2xl ${
                  darkMode ? 'bg-gray-800/50' : 'bg-white/70'
                } backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105`}
              >
                <feature.icon
                  className={`w-12 h-12 mb-4 ${
                    darkMode ? 'text-purple-400' : 'text-purple-600'
                  }`}
                />

                <h3
                  className={`text-xl font-bold mb-3 ${
                    darkMode ? 'text-white' : 'text-gray-800'
                  }`}
                >
                  {feature.title}
                </h3>

                <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Posts Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2
            className={`text-3xl md:text-4xl font-bold text-center mb-12 ${
              darkMode ? 'text-white' : 'text-gray-800'
            }`}
          >
            Latest Insights
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.map((post, index) => (
              <article
                key={index}
                className={`rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 ${
                  darkMode ? 'bg-gray-800' : 'bg-white'
                }`}
              >
                <img src={post.image} alt={post.title} className="w-full h-48 object-cover" />

                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        darkMode
                          ? 'bg-purple-900/50 text-purple-300'
                          : 'bg-purple-100 text-purple-600'
                      }`}
                    >
                      {post.category}
                    </span>

                    <span
                      className={`text-xs flex items-center ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      {post.readTime}
                    </span>
                  </div>

                  <h3
                    className={`text-xl font-bold mb-3 ${
                      darkMode ? 'text-white' : 'text-gray-800'
                    }`}
                  >
                    {post.title}
                  </h3>

                  <p className={`text-sm mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {post.excerpt}
                  </p>

                  <button
                    className={`text-sm font-semibold ${
                      darkMode
                        ? 'text-purple-400 hover:text-purple-300'
                        : 'text-purple-600 hover:text-purple-700'
                    } transition-colors`}
                    onClick={() => setSelectedPost(post)}
                  >
                    Read More →
                  </button>
                </div>
              </article>
            ))}
          </div>

          {/* More Tutorials Button */}
          <div className="mt-12 flex justify-center">
            <a
              href="https://blog.vpnhub.uk/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-lg"
            >
              More Tutorials →
            </a>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        className={`py-20 px-4 ${
          darkMode
            ? 'bg-gradient-to-r from-purple-900/50 to-blue-900/50'
            : 'bg-gradient-to-r from-purple-100/50 to-blue-100/50'
        }`}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2
            className={`text-3xl md:text-4xl font-bold mb-6 ${
              darkMode ? 'text-white' : 'text-gray-800'
            }`}
          >
            Ready to Secure Your Digital Life?
          </h2>

          <p className={`text-xl mb-8 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Join thousands of users who trust VPNHUB for their online privacy and security needs.
          </p>
        </div>
      </section>

      {/* Sign Up Popup */}
      {showSignUpPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-3 sm:p-6">
          <div
            className={`relative w-full max-w-sm sm:max-w-md rounded-xl shadow-xl ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            } transition-all duration-300`}
          >
            <button
              onClick={() => setShowSignUpPopup(false)}
              className={`absolute top-3 right-3 p-1.5 rounded-full transition-colors ${
                darkMode
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-6 sm:p-8">
              <div className="text-center mb-5">
                <div
                  className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center ${
                    darkMode
                      ? 'bg-purple-900/20 text-purple-400'
                      : 'bg-purple-100 text-purple-600'
                  }`}
                >
                  <Shield className="w-6 h-6" />
                </div>

                <h2
                  className={`text-xl sm:text-2xl font-bold mb-1 ${
                    darkMode ? 'text-white' : 'text-gray-800'
                  }`}
                >
                  Secure Your Privacy Now
                </h2>

                <p className={`text-xs sm:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Join VPNHUB and protect your digital life today
                </p>
              </div>

              <form onSubmit={handleSignUpSubmit} className="space-y-3 sm:space-y-4">
                <div>
                  <label
                    className={`block text-xs sm:text-sm font-medium mb-1 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    <User className="w-3.5 h-3.5 inline mr-1.5" />
                    Full Name
                  </label>

                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-400'
                        : 'bg-white border-gray-300 text-gray-800 focus:border-purple-500'
                    } focus:outline-none focus:ring-1 focus:ring-purple-200`}
                    required
                  />
                </div>

                <div>
                  <label
                    className={`block text-xs sm:text-sm font-medium mb-1 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5 inline mr-1.5" />
                    Phone Number
                  </label>

                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-400'
                        : 'bg-white border-gray-300 text-gray-800 focus:border-purple-500'
                    } focus:outline-none focus:ring-1 focus:ring-purple-200`}
                    required
                  />
                </div>

                <div>
                  <label
                    className={`block text-xs sm:text-sm font-medium mb-1 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5 inline mr-1.5" />
                    Email Address
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-400'
                        : 'bg-white border-gray-300 text-gray-800 focus:border-purple-500'
                    } focus:outline-none focus:ring-1 focus:ring-purple-200`}
                    required
                  />
                </div>

                <div>
                  <label
                    className={`block text-xs sm:text-sm font-medium mb-1 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5 inline mr-1.5" />
                    Password
                  </label>

                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 pr-9 rounded-lg border text-sm transition-colors ${
                        darkMode
                          ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-400'
                          : 'bg-white border-gray-300 text-gray-800 focus:border-purple-500'
                      } focus:outline-none focus:ring-1 focus:ring-purple-200`}
                      required
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-2 top-1/2 transform -translate-y-1/2 ${
                        darkMode
                          ? 'text-gray-400 hover:text-gray-200'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-2.5 rounded-lg font-semibold text-white transition-all duration-300 text-sm sm:text-base ${
                    isLoading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105'
                  }`}
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </button>
              </form>

              <div className="mt-5 text-center">
                <p className={`text-xs sm:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Already have an account?

                  <button
                    onClick={() => {
                      setShowSignUpPopup(false);
                      onShowAuth();
                    }}
                    className={`ml-1.5 font-semibold ${
                      darkMode
                        ? 'text-purple-400 hover:text-purple-300'
                        : 'text-purple-600 hover:text-purple-700'
                    } transition-colors`}
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}