import React from 'react';
import { Shield, Clock, User, ArrowLeft } from 'lucide-react';

interface BlogPageProps {
  darkMode: boolean;
  onBack: () => void;
}

export default function BlogPage({ darkMode, onBack }: BlogPageProps) {
  const blogPosts = [
    {
      id: 1,
      title: "Why VPN Security Matters More Than Ever in 2025",
      excerpt: "With increasing cyber threats and privacy concerns, protecting your online identity has become crucial. Learn how VPNs provide essential security layers for modern internet users.",
      content: `
        <p>In today's digital landscape, online privacy and security have become more critical than ever. With cyber threats evolving rapidly and data breaches making headlines daily, protecting your digital footprint is no longer optional—it's essential.</p>
        
        <h3>The Growing Threat Landscape</h3>
        <p>Cybercriminals are becoming increasingly sophisticated, targeting everything from personal data to financial information. Public Wi-Fi networks, once convenient, are now hunting grounds for hackers looking to intercept sensitive information.</p>
        
        <h3>How VPNs Provide Protection</h3>
        <p>Virtual Private Networks create an encrypted tunnel between your device and the internet, making it virtually impossible for third parties to intercept your data. This military-grade encryption ensures that your browsing habits, personal information, and communications remain private.</p>
        
        <h3>Beyond Security: Privacy in the Digital Age</h3>
        <p>ISPs, advertisers, and even governments are increasingly monitoring online activities. A VPN masks your IP address and location, giving you back control over your digital privacy and allowing you to browse the internet as it was meant to be—free and open.</p>
      `,
      readTime: "5 min read",
      category: "Security",
      author: "Security Expert",
      publishDate: "January 15, 2025",
      image: "https://images.pexels.com/photos/60504/security-protection-anti-virus-software-60504.jpeg?auto=compress&cs=tinysrgb&w=800"
    },
    {
      id: 2,
      title: "Streaming Without Borders: Unlock Global Content",
      excerpt: "Access your favorite shows and movies from anywhere in the world. Discover how VPNs break down geographical barriers for entertainment and open up a world of content.",
      content: `
        <p>Geographic restrictions on streaming content have become one of the most frustrating aspects of modern entertainment. Your favorite show might be available in one country but blocked in another, creating an uneven playing field for global audiences.</p>
        
        <h3>Understanding Geo-Blocking</h3>
        <p>Streaming services use geo-blocking technology to restrict content based on your location. This is often due to licensing agreements, regional regulations, or content distribution rights that vary by country.</p>
        
        <h3>VPNs: Your Passport to Global Entertainment</h3>
        <p>By connecting to VPN servers in different countries, you can virtually relocate yourself and access content libraries from around the world. Whether it's Netflix US, BBC iPlayer, or regional sports broadcasts, a VPN opens doors to unlimited entertainment.</p>
        
        <h3>Choosing the Right Server</h3>
        <p>Different streaming services have varying levels of VPN detection. Premium VPN services maintain dedicated streaming servers that are optimized for speed and reliability, ensuring smooth playback without buffering.</p>
      `,
      readTime: "4 min read",
      category: "Streaming",
      author: "Entertainment Specialist",
      publishDate: "January 12, 2025",
      image: "https://images.pexels.com/photos/4009402/pexels-photo-4009402.jpeg?auto=compress&cs=tinysrgb&w=800"
    },
    {
      id: 3,
      title: "Remote Work Security: Protecting Your Business Data",
      excerpt: "As remote work becomes the norm, securing business communications and data transfer is paramount. Learn enterprise VPN best practices for modern distributed teams.",
      content: `
        <p>The shift to remote work has fundamentally changed how businesses operate, but it has also introduced new security challenges. With employees accessing company resources from various locations and networks, traditional security perimeters no longer exist.</p>
        
        <h3>The Remote Work Security Challenge</h3>
        <p>Home networks, coffee shop Wi-Fi, and mobile hotspots lack the security infrastructure of corporate networks. This creates vulnerabilities that cybercriminals are eager to exploit, putting sensitive business data at risk.</p>
        
        <h3>Enterprise VPN Solutions</h3>
        <p>Business-grade VPNs provide secure tunnels for remote employees to access company resources safely. These solutions offer features like multi-factor authentication, centralized management, and detailed logging for compliance requirements.</p>
        
        <h3>Best Practices for Business VPN Usage</h3>
        <p>Implementing a successful VPN strategy requires proper planning, employee training, and regular security audits. Companies should establish clear policies for VPN usage and ensure all remote workers understand the importance of maintaining secure connections.</p>
      `,
      readTime: "6 min read",
      category: "Business",
      author: "IT Security Consultant",
      publishDate: "January 10, 2025",
      image: "https://images.pexels.com/photos/4226140/pexels-photo-4226140.jpeg?auto=compress&cs=tinysrgb&w=800"
    }
  ];

  const [selectedPost, setSelectedPost] = React.useState<typeof blogPosts[0] | null>(null);

  if (selectedPost) {
    return (
      <div className={`min-h-screen transition-all duration-300 ${
        darkMode 
          ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900' 
          : 'bg-gradient-to-br from-gray-50 via-purple-50 to-blue-50'
      }`}>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button
            onClick={() => setSelectedPost(null)}
            className={`flex items-center space-x-2 mb-8 px-4 py-2 rounded-lg transition-colors ${
              darkMode 
                ? 'text-purple-400 hover:text-purple-300 hover:bg-gray-800' 
                : 'text-purple-600 hover:text-purple-700 hover:bg-white'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Blog</span>
          </button>

          <article className={`rounded-2xl overflow-hidden shadow-2xl ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <img
              src={selectedPost.image}
              alt={selectedPost.title}
              className="w-full h-64 md:h-96 object-cover"
            />
            
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  darkMode 
                    ? 'bg-purple-900/50 text-purple-300' 
                    : 'bg-purple-100 text-purple-600'
                }`}>
                  {selectedPost.category}
                </span>
                <div className={`flex items-center space-x-4 text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
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

              <h1 className={`text-3xl md:text-4xl font-bold mb-4 ${
                darkMode ? 'text-white' : 'text-gray-800'
              }`}>
                {selectedPost.title}
              </h1>

              <p className={`text-lg mb-6 ${
                darkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {selectedPost.publishDate}
              </p>

              <div 
                className={`prose prose-lg max-w-none ${
                  darkMode ? 'prose-invert' : ''
                }`}
                dangerouslySetInnerHTML={{ __html: selectedPost.content }}
              />
            </div>
          </article>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-300 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900' 
        : 'bg-gradient-to-br from-gray-50 via-purple-50 to-blue-50'
    }`}>
      {/* Header */}
      <header className={`${
        darkMode 
          ? 'bg-gray-800/90 border-gray-700' 
          : 'bg-white/90 border-gray-200'
      } backdrop-blur-md border-b sticky top-0 z-40`}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className={`w-8 h-8 ${
              darkMode ? 'text-purple-400' : 'text-purple-600'
            }`} />
            <h1 className={`text-2xl font-bold ${
              darkMode ? 'text-white' : 'text-gray-800'
            }`}>
              VPNHUB Blog
            </h1>
          </div>
          
          <button
            onClick={onBack}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
              darkMode 
                ? 'text-gray-300 hover:text-white hover:bg-gray-700' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
        </div>
      </header>

      {/* Blog Posts */}
      <main className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className={`text-4xl md:text-5xl font-bold mb-6 ${
              darkMode ? 'text-white' : 'text-gray-800'
            }`}>
              VPN Insights & Security Tips
            </h1>
            <p className={`text-xl max-w-3xl mx-auto ${
              darkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Stay informed about the latest in digital privacy, security, and VPN technology
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.map((post) => (
              <article 
                key={post.id} 
                className={`rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer ${
                  darkMode ? 'bg-gray-800' : 'bg-white'
                }`}
                onClick={() => setSelectedPost(post)}
              >
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      darkMode 
                        ? 'bg-purple-900/50 text-purple-300' 
                        : 'bg-purple-100 text-purple-600'
                    }`}>
                      {post.category}
                    </span>
                    <span className={`text-xs flex items-center ${
                      darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      <Clock className="w-3 h-3 mr-1" />
                      {post.readTime}
                    </span>
                  </div>
                  <h3 className={`text-xl font-bold mb-3 ${
                    darkMode ? 'text-white' : 'text-gray-800'
                  }`}>
                    {post.title}
                  </h3>
                  <p className={`text-sm mb-4 ${
                    darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${
                      darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {post.author} • {post.publishDate}
                    </span>
                   
             <button 
  type="button"
  className={`text-sm font-semibold ${
    darkMode ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700'
  } transition-colors`}
>
  Read More →
</button>


                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}