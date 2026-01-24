import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeftIcon, 
  ScaleIcon, 
  UserGroupIcon, 
  ShieldCheckIcon,
  NoSymbolIcon,
  ServerIcon,
  AcademicCapIcon,
  ExclamationTriangleIcon,
  BuildingLibraryIcon as GavelIcon
} from '@heroicons/react/24/outline';

export default function TermsAndConditions() {
  // Smooth scroll handler
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Sidebar navigation items
  const navItems = [
    'Introduction',
    'User Roles',
    'Account Security',
    'Acceptable Use',
    'Data & IP',
    'Liability & Service',
    'Termination',
    'Governing Law'
  ];

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
              {navItems.map((item, index) => (
                <li key={index}>
                  <button 
                    onClick={() => scrollToSection(item.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-'))}
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
                These terms are legally binding. Last updated on <br />
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
                <GavelIcon className="h-4 w-4" />
                Legal Agreement
              </div>
              <h1 className="text-5xl lg:text-6xl text-gray-900 mb-6 tracking-tight leading-none font-bold">
                Terms and Conditions
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed max-w-2xl font-bold">
                By accessing this system, you agree to comply with the following regulations governing the evaluation of academic materials.
              </p>
            </header>

            {/* Content Blocks */}
            <div className="space-y-16">
              
              {/* Section 1: Intro */}
              <section id="introduction" className="scroll-mt-32">
                <h2 className="text-3xl text-gray-900 mb-6 font-bold">1. Introduction</h2>
                <div className="text-gray-600 leading-loose font-bold">
                  <p>
                    Welcome to the Copy Checker System. These Terms and Conditions ("Terms") constitute a binding legal agreement between you and the institution. This system is designed specifically for the digital management and evaluation of student examination scripts.
                  </p>
                  <p className="mt-4">
                    If you do not agree with any part of these terms, you are prohibited from using the service. Continued use implies full acceptance of these operational guidelines.
                  </p>
                </div>
              </section>

              {/* Section 2: Roles */}
              <section id="user-roles" className="scroll-mt-32">
                <h2 className="text-3xl text-gray-900 mb-6 font-bold">2. User Roles & Responsibilities</h2>
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Admin Card */}
                  <div className="border-2 border-gray-900 p-6 hover:bg-gray-50 transition-colors duration-300 rounded-lg">
                    <UserGroupIcon className="h-6 w-6 text-gray-900 mb-4" />
                    <h3 className="font-bold text-lg mb-3 text-gray-900">Administrators</h3>
                    <ul className="text-sm text-gray-600 space-y-2 font-bold">
                      <li>• Manage user accounts</li>
                      <li>• Upload question papers</li>
                      <li>• Assign examiners</li>
                      <li>• Finalize result release</li>
                    </ul>
                  </div>
                  {/* Examiner Card */}
                  <div className="border-2 border-gray-900 p-6 hover:bg-gray-50 transition-colors duration-300 rounded-lg">
                    <AcademicCapIcon className="h-6 w-6 text-gray-900 mb-4" />
                    <h3 className="font-bold text-lg mb-3 text-gray-900">Examiners</h3>
                    <ul className="text-sm text-gray-600 space-y-2 font-bold">
                      <li>• Fair evaluation of scripts</li>
                      <li>• Provide constructive feedback</li>
                      <li>• Adhere to deadlines</li>
                      <li>• Resolve specific queries</li>
                    </ul>
                  </div>
                  {/* Student Card */}
                  <div className="border-2 border-gray-900 p-6 hover:bg-gray-50 transition-colors duration-300 rounded-lg">
                    <UserGroupIcon className="h-6 w-6 text-gray-900 mb-4" />
                    <h3 className="font-bold text-lg mb-3 text-gray-900">Students</h3>
                    <ul className="text-sm text-gray-600 space-y-2 font-bold">
                      <li>• View evaluated copies</li>
                      <li>• Raise legitimate queries</li>
                      <li>• Respect evaluation outcomes</li>
                      <li>• Maintain integrity</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 3 & 4: Security & Usage */}
              <section id="account-security" className="scroll-mt-32">
                <h2 className="text-3xl text-gray-900 mb-6 font-bold">3. Account Security</h2>
                <div className="flex items-start gap-4 p-6 bg-white border-2 border-gray-900 rounded-lg">
                  <ShieldCheckIcon className="h-6 w-6 text-gray-900 flex-shrink-0 mt-1" />
                  <div className="space-y-2 text-gray-600 font-bold">
                    <p>Users are strictly responsible for maintaining the confidentiality of their login credentials.</p>
                    <p>You must notify administrators immediately of any unauthorized access. The institution is not liable for losses caused by stolen credentials.</p>
                  </div>
                </div>
              </section>

              <section id="acceptable-use" className="scroll-mt-32">
                <h2 className="text-3xl text-gray-900 mb-6 font-bold">4. Acceptable Use Policy</h2>
                <div className="space-y-4">
                  <p className="text-gray-600 mb-4 font-bold">You agree not to engage in any of the following prohibited activities:</p>
                  <ul className="space-y-3">
                    {[
                      'Attempting to reverse engineer or disrupt the system.',
                      'Uploading malicious code, viruses, or harmful scripts.',
                      'Harassing, abusing, or harming other users.',
                      'Manipulating evaluation data or falsifying marks.',
                      'Distributing copyrighted examination materials without consent.'
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-gray-700 font-bold">
                        <NoSymbolIcon className="h-5 w-5 text-gray-900 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* Section 5 & 6: Data & IP */}
              <section id="data-ip" className="scroll-mt-32">
                <h2 className="text-3xl text-gray-900 mb-6 font-bold">5. Data & Intellectual Property</h2>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 mb-3 flex items-center gap-2">
                      <ServerIcon className="h-5 w-5" /> Storage
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed font-bold">
                      All uploaded documents are stored securely on Google Drive with strict access control lists (ACL). While we implement industry-standard encryption, no internet transmission is guaranteed to be 100% secure.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 mb-3 flex items-center gap-2">
                      <AcademicCapIcon className="h-5 w-5" /> Ownership
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed font-bold">
                      All examination materials, including question papers and annotated answer scripts, remain the sole intellectual property of the educational institution. Unauthorized distribution is a violation of policy.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 7, 8, 9: Liability */}
              <section id="liability-service" className="scroll-mt-32">
                <h2 className="text-3xl text-gray-900 mb-6 font-bold">6. Limitation of Liability</h2>
                <div className="bg-gray-900 text-white p-10 rounded-lg border-2 border-gray-900">
                  <div className="flex items-start gap-4">
                    <ExclamationTriangleIcon className="h-8 w-8 text-gray-400" />
                    <div>
                      <h3 className="text-xl font-bold uppercase tracking-wide mb-2">Disclaimer of Warranties</h3>
                      <p className="text-gray-300 leading-relaxed mb-6 font-bold">
                        The system is provided "as is" and "as available". We expressly disclaim all warranties of any kind. We are not liable for any direct, indirect, incidental, or consequential damages arising from:
                      </p>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400 font-bold">
                        <li>• Service interruptions or data loss</li>
                        <li>• Errors in evaluation or marking</li>
                        <li>• Unauthorized access to servers</li>
                        <li>• Incompatibility with user devices</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 10 & 11: Termination & Law */}
              <section id="termination" className="scroll-mt-32">
                <h2 className="text-3xl text-gray-900 mb-6 font-bold">7. Termination</h2>
                <p className="text-gray-600 leading-relaxed font-bold">
                  The institution reserves the right to suspend or terminate any user account immediately, without prior notice, for conduct that violates these Terms, harms other users, or creates liability for the institution. Upon termination, your right to use the system will immediately cease.
                </p>
              </section>

              <section id="governing-law" className="scroll-mt-32 border-t-2 border-gray-900 pt-16">
                <h2 className="text-3xl text-gray-900 mb-8 font-bold">8. Governing Law & Contact</h2>
                
                <div className="flex flex-col md:flex-row gap-12">
                  <div className="flex-1">
                    <p className="text-gray-600 mb-6 leading-relaxed font-bold">
                      These Terms shall be governed by and construed in accordance with the laws of <strong>India</strong>. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts located within the institution's district.
                    </p>
                    <p className="text-sm text-gray-600 italic font-bold">
                      We reserve the right to modify these terms. Continued use constitutes acceptance.
                    </p>
                  </div>

                  <div className="flex-1 bg-white p-6 border-2 border-gray-900 rounded-lg">
                    <h4 className="font-bold text-sm mb-4 uppercase tracking-wider text-gray-900">Contact Administration</h4>
                    <div className="space-y-1 text-sm">
                      <p className="font-bold text-gray-900">Prasad Institute of Medical Sciences</p>
                      <a href="mailto:info@prasad.edu.in" className="text-gray-600 hover:text-[#1e3a8a] hover:underline transition-colors font-bold">info@prasad.edu.in</a>
                      <p className="text-gray-600 mt-2 font-bold">Lucknow, Uttar Pradesh</p>
                    </div>
                  </div>
                </div>
              </section>

            </div>

            {/* Footer */}
            <footer className="mt-24 pt-8 border-t-2 border-gray-900 space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-600 font-bold">
                <p>&copy; 2026 Prasad Institute of Medical Sciences. All rights reserved.</p>
                <div className="flex gap-6 mt-4 md:mt-0">
                  <Link to="/privacy" className="hover:text-[#1e3a8a] transition-colors">Privacy Policy</Link>
                  <span className="cursor-not-allowed opacity-50">SLA</span>
                  <span className="cursor-not-allowed opacity-50">Support</span>
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