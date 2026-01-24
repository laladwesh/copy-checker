import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeftIcon, 
  ShieldCheckIcon, 
  ScaleIcon, 
  LockClosedIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

export default function PrivacyPolicy() {
  // Smooth scroll handler
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-black selection:text-white" style={{fontFamily: 'Dosis, sans-serif'}}>
      
      {/* 1. TOP NAVIGATION (Full Width, Sticky) */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b-2 border-gray-900 h-16 flex items-center justify-between px-6 lg:px-12">
        <div className="flex items-center gap-3">
          <div className="bg-gray-900 text-white p-1.5 rounded">
            <ScaleIcon className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">Copy Checker System</span>
        </div>
        
        <Link 
          to="/" 
          className="group flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-[#1e3a8a] transition-colors"
        >
          <span>Return to Dashboard</span>
          <ArrowLeftIcon className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        </Link>
      </nav>

      {/* 2. MAIN LAYOUT (Full Screen Split) */}
      <div className="pt-16 flex flex-col lg:flex-row min-h-screen">
        
        {/* LEFT SIDEBAR - NAVIGATION (Sticky, 25% Width) */}
        <aside className="lg:w-1/4 xl:w-1/5 border-r-2 border-gray-900 bg-white hidden lg:block">
          <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto p-8 lg:p-12">
            <h5 className="font-bold text-xs uppercase tracking-widest text-gray-600 mb-6">Contents</h5>
            <ul className="space-y-4 text-sm font-bold text-gray-600">
              {['Introduction', 'Data Collection', 'Usage Protocol', 'Storage & Security', 'User Rights', 'Legal Contact'].map((item, index) => (
                <li key={index}>
                  <button 
                    onClick={() => scrollToSection(item.toLowerCase().replace(/ /g, '-'))}
                    className="flex items-center gap-3 hover:text-[#1e3a8a] transition-colors text-left w-full group"
                  >
                    <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full border-2 border-gray-900 text-[10px] text-gray-900 group-hover:bg-[#1e3a8a] group-hover:text-white group-hover:border-[#1e3a8a] transition-all">
                      {index + 1}
                    </span>
                    {item}
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-12 pt-12 border-t-2 border-gray-900">
              <p className="text-xs text-gray-600 leading-relaxed font-bold">
                This policy is legally binding. Last updated on <br />
                <span className="text-gray-900 font-bold">January 6, 2026</span>.
              </p>
            </div>
          </div>
        </aside>

        {/* RIGHT CONTENT - DOCUMENT (75% Width) */}
        <main className="flex-1 bg-white">
          <div className="max-w-4xl mx-auto px-6 py-12 lg:px-16 lg:py-20">
            
            {/* Document Header */}
            <header className="mb-16 border-b-2 border-gray-900 pb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white border-2 border-gray-900 text-xs font-bold uppercase tracking-wider mb-6">
                <ShieldCheckIcon className="h-4 w-4" />
                Official Document
              </div>
              <h1 className="text-5xl lg:text-6xl text-gray-900 mb-6 tracking-tight leading-none font-bold">
                Privacy Policy
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed max-w-2xl font-bold">
                We are dedicated to protecting the confidentiality and security of your academic data through strict compliance with educational standards.
              </p>
            </header>

            {/* Content Blocks */}
            <div className="space-y-16">
              
              {/* Section 1 */}
              <section id="introduction" className="scroll-mt-32">
                <h2 className="text-3xl text-gray-900 mb-6 font-bold">1. Introduction</h2>
                <div className="text-gray-600 leading-loose font-bold">
                  <p>
                    This Privacy Policy constitutes a legal agreement between the user ("you") and the Copy Checker System ("we", "us"). It delineates the protocols regarding the collection, use, storage, and protection of personal and academic data.
                  </p>
                  <p className="mt-4">
                    By accessing or using our platform, you acknowledge that you have read, understood, and agreed to be bound by the terms detailed herein. If you do not agree, you must discontinue use of the system immediately.
                  </p>
                </div>
              </section>

              {/* Section 2 */}
              <section id="data-collection" className="scroll-mt-32">
                <h2 className="text-3xl text-gray-900 mb-6 font-bold">2. Data Collection Framework</h2>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="border-2 border-gray-900 p-8 hover:bg-gray-50 transition-colors duration-300 rounded-lg">
                    <DocumentTextIcon className="h-8 w-8 text-gray-900 mb-4" />
                    <h3 className="font-bold text-lg mb-3 text-gray-900">Personal Identifiers</h3>
                    <ul className="space-y-2 text-gray-600 text-sm leading-relaxed font-bold">
                      <li>• Full Legal Name & Roll Number</li>
                      <li>• Institutional Email Address</li>
                      <li>• Departmental Affiliation</li>
                      <li>• Encrypted Authentication Credentials</li>
                    </ul>
                  </div>
                  <div className="border-2 border-gray-900 p-8 hover:bg-gray-50 transition-colors duration-300 rounded-lg">
                    <DocumentTextIcon className="h-8 w-8 text-gray-900 mb-4" />
                    <h3 className="font-bold text-lg mb-3 text-gray-900">Academic Records</h3>
                    <ul className="space-y-2 text-gray-600 text-sm leading-relaxed font-bold">
                      <li>• Digitized Answer Scripts (PDF)</li>
                      <li>• Evaluation Marks & Annotations</li>
                      <li>• Examiner Comments & Feedback</li>
                      <li>• Access Logs & Timestamps</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 3 */}
              <section id="usage-protocol" className="scroll-mt-32">
                <h2 className="text-3xl text-gray-900 mb-6 font-bold">3. Usage Protocol</h2>
                <p className="text-gray-600 text-lg leading-relaxed mb-6 font-bold">
                  Data processed by the Copy Checker System is utilized strictly for educational administration. We do not monetize, sell, or trade user data.
                </p>
                <div className="pl-6 border-l-2 border-gray-900 space-y-4">
                  <div>
                    <strong className="block text-gray-900 font-bold">Evaluation Mechanics</strong>
                    <span className="text-gray-600 font-bold">To enable examiners to digitally review, annotate, and grade student submissions.</span>
                  </div>
                  <div>
                    <strong className="block text-gray-900 font-bold">Audit Trails</strong>
                    <span className="text-gray-600 font-bold">To maintain an immutable record of grade changes and system access for accountability.</span>
                  </div>
                  <div>
                    <strong className="block text-gray-900 font-bold">Institutional Compliance</strong>
                    <span className="text-gray-600 font-bold">To generate necessary reports required by the university examination cell.</span>
                  </div>
                </div>
              </section>

              {/* Section 4 */}
              <section id="storage-&-security" className="scroll-mt-32">
                <h2 className="text-3xl text-gray-900 mb-6 font-bold">4. Storage & Security Infrastructure</h2>
                <div className="bg-gray-900 text-white p-10 rounded-lg border-2 border-gray-900">
                  <div className="flex items-start gap-4 mb-6">
                    <LockClosedIcon className="h-8 w-8 text-gray-400" />
                    <div>
                      <h3 className="text-xl font-bold">Zero-Trust Architecture</h3>
                      <p className="text-gray-400 mt-2 leading-relaxed font-bold">
                        We employ a defense-in-depth strategy. Data is encrypted both in transit (using TLS 1.3) and at rest (using AES-256 standards).
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t-2 border-gray-700 pt-6">
                    <div>
                      <h4 className="font-bold text-sm uppercase tracking-wide text-gray-400 mb-2">Document Storage</h4>
                      <p className="text-sm font-bold">Secure Google Drive API containers with restricted service account access.</p>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm uppercase tracking-wide text-gray-400 mb-2">Database</h4>
                      <p className="text-sm font-bold">MongoDB Enterprise with Role-Based Access Control (RBAC) enforcement.</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 5 */}
              <section id="user-rights" className="scroll-mt-32">
                <h2 className="text-3xl text-gray-900 mb-6 font-bold">5. User Rights</h2>
                <div className="space-y-6">
                  <p className="text-gray-600 leading-relaxed font-bold">
                    Under applicable data protection regulations, users retain specific rights regarding their personal information held within the system.
                  </p>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {['Right to Access', 'Right to Rectification', 'Right to Erasure', 'Right to Export'].map((right) => (
                      <li key={right} className="flex items-center gap-3 p-4 bg-white border-2 border-gray-900 rounded-lg">
                        <div className="h-2 w-2 bg-gray-900 rounded-full"></div>
                        <span className="font-bold text-gray-900">{right}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-gray-600 italic mt-4 font-bold">
                    * Note: The "Right to Erasure" is subject to institutional data retention policies regarding academic records.
                  </p>
                </div>
              </section>

              {/* Section 6 */}
              <section id="legal-contact" className="scroll-mt-32 border-t-2 border-gray-900 pt-16">
                <h2 className="text-3xl text-gray-900 mb-8 font-bold">6. Contact Administration</h2>
                
                <div className="flex flex-col md:flex-row gap-12">
                  <div className="flex-1">
                    <p className="text-gray-600 mb-6 font-bold">
                      For legal inquiries, data subject requests, or security reports, please contact the designated controller:
                    </p>
                    <div className="space-y-1">
                      <p className="font-bold text-gray-900">System Administrator</p>
                      <p className="text-gray-600 font-bold">Prasad Institute of Medical Sciences</p>
                      <a href="mailto:info@prasad.edu.in" className="text-gray-900 border-b-2 border-gray-900 hover:text-[#1e3a8a] hover:border-[#1e3a8a] transition-colors font-bold">info@prasad.edu.in</a>
                    </div>
                  </div>

                  <div className="flex-1 bg-white p-6 border-2 border-gray-900 rounded-lg">
                    <h4 className="font-bold text-sm mb-2 text-gray-900">Mailing Address</h4>
                    <address className="text-gray-600 not-italic text-sm leading-relaxed font-bold">
                      Prasad Institute of Medical Sciences<br />
                      Examination Cell<br />
                      Lucknow, Uttar Pradesh - 226401
                    </address>
                  </div>
                </div>
              </section>

            </div>

            {/* Footer */}
            <footer className="mt-24 pt-8 border-t-2 border-gray-900 space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-600 font-bold">
                <p>&copy; 2026 Prasad Institute of Medical Sciences. Restricted Access.</p>
                <div className="flex gap-6 mt-4 md:mt-0">
                  <Link to="/terms" className="hover:text-[#1e3a8a] transition-colors">Terms of Service</Link>
                  <span>Security</span>
                  <span>Support</span>
                </div>
              </div>
              <div className="text-center text-xs text-gray-600 pt-4 border-t-2 border-gray-900 font-bold">
                <p>Developed by <span className="font-bold text-gray-900">Avinash Gupta</span>, BTech Student at IIT Guwahati</p>
                <p className="mt-1">Built on freelance/contract basis • Access granted to Prasad Institute of Medical Sciences</p>
              </div>
            </footer>

          </div>
        </main>
      </div>
    </div>
  );
}