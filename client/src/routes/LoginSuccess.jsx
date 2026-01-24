import React, { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  ArrowPathIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline"; // Import icons from Heroicons

// Assuming setToken and getUser are defined elsewhere, e.g., in src/utils/auth.js
// These functions are now expected to be provided by your application's authentication utility.
import { setToken, getUser } from "../utils/auth";

export default function LoginSuccess() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const [status, setStatus] = useState("loading");
  // status: 'loading' | 'signed-in' | 'no-token'

  // Determine the base URL for the API call based on NODE_ENV
  // In a real application, you might use a more robust configuration system
  const apiBaseUrl =
    process.env.NODE_ENV === "production"
      ? "" // Or your production backend URL
      : "http://localhost:5000"; // Relative path for development (assuming same origin)

  const googleAuthUrl = `${apiBaseUrl}/api/auth/google`;

  useEffect(() => {
    const existingUser = getUser();
    if (existingUser) {
      // Already signed in from previous session
      navigate(`/${existingUser.role}`, { replace: true });
      return;
    }

    const params = new URLSearchParams(search);
    const token = params.get("token");

    if (token) {
      // Store the new token
      setToken(token);
      const newUser = getUser(); // Re-fetch user after setting token
      if (newUser) {
        setStatus("signed-in");
        navigate(`/${newUser.role}`, { replace: true });
      } else {
        // Token decode failed for some reason
        setStatus("no-token");
      }
    } else {
      // No token in URL and none in storage
      setStatus("no-token");
    }
  }, [search, navigate]);

  // Render loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4 sm:p-6" style={{fontFamily: 'Dosis, sans-serif'}}>
        <div className="flex flex-col items-center justify-center p-8 sm:p-10 rounded-xl border-2 border-gray-900 bg-white transform transition-all duration-500 ease-out-back scale-95 opacity-0 animate-fade-in-up">
          <ArrowPathIcon className="animate-spin h-16 w-16 text-gray-900 mb-6" />
          <p className="text-2xl text-gray-900 font-bold mb-3">
            Signing you in securely...
          </p>
          <p className="text-gray-600 text-md text-center max-w-sm font-bold">
            Please wait a moment while we set up your session and redirect you
            to your dashboard.
          </p>
        </div>
      </div>
    );
  }

  // Render sign-in prompt if no token is found
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 sm:p-6" style={{fontFamily: 'Dosis, sans-serif'}}>
      <div className="flex flex-col items-center justify-center bg-white p-10 sm:p-12 rounded-xl border-2 border-gray-900 transform transition-all duration-500 ease-out-back scale-95 opacity-0 animate-fade-in-up max-w-md w-full text-center">
        <ExclamationCircleIcon className="h-16 w-16 text-gray-900 mb-6" />
        <h2 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">
          Access Denied!
        </h2>
        <p className="text-xl text-gray-700 mb-8 leading-relaxed font-bold">
          It looks like you're not signed in or your session has expired. Please
          sign in to continue using our services.
        </p>
        <a
          href={googleAuthUrl}
          className="inline-flex items-center px-6 py-2 border-2 border-gray-900 text-base font-bold rounded-lg text-white bg-gray-900 hover:bg-[#1e3a8a] focus:outline-none transition-all duration-300 transform hover:-translate-y-0.5 hover:scale-105 group"
        >
          {/* Updated Google G icon SVG with the new path */}
          <svg
            className="w-5 h-5 mr-2 transition-transform duration-300 group-hover:rotate-[360deg]"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M15.545 6.558a9.4 9.4 0 0 1 .139 1.626c0 2.434-.87 4.492-2.384 5.885h.002C11.978 15.292 10.158 16 8 16A8 8 0 1 1 8 0a7.7 7.7 0 0 1 5.352 2.082l-2.284 2.284A4.35 4.35 0 0 0 8 3.166c-2.087 0-3.86 1.408-4.492 3.304a4.8 4.8 0 0 0 0 3.063h.003c.635 1.893 2.405 3.301 4.492 3.301 1.078 0 2.004-.276 2.722-.764h-.003a3.7 3.7 0 0 0 1.599-2.431H8v-3.08z" />
          </svg>
          Sign in with Google
        </a>
        <p className="text-sm text-gray-600 mt-8 leading-relaxed font-bold">
          By signing in, you agree to our{" "}
          <Link
            to="/terms"
            className="text-gray-900 hover:text-[#1e3a8a] underline font-bold"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            to="/privacy"
            className="text-gray-900 hover:text-[#1e3a8a] underline font-bold"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
