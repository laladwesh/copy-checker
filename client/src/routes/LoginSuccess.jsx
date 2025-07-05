// src/routes/LoginSuccess.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { setToken, getUser } from '../utils/auth';

export default function LoginSuccess() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const [status, setStatus] = useState('loading');
  // status: 'loading' | 'signed-in' | 'no-token'

  useEffect(() => {
    const existingUser = getUser();
    if (existingUser) {
      // Already signed in from previous session
      navigate(`/${existingUser.role}`, { replace: true });
      return;
    }

    const params = new URLSearchParams(search);
    const token = params.get('token');

    if (token) {
      // Store the new token
      setToken(token);
      const newUser = getUser();
      if (newUser) {
        setStatus('signed-in');
        navigate(`/${newUser.role}`, { replace: true });
      } else {
        // Token decode failed for some reason
        setStatus('no-token');
      }
    } else {
      // No token in URL and none in storage
      setStatus('no-token');
    }
  }, [search, navigate]);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-full mt-20">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 rounded-full mb-4" />
        <p className="text-gray-700">Signing you in…</p>
      </div>
    );
  }

  // No token anywhere: show sign-in UI
  return (
    <div className="flex flex-col items-center justify-center h-full mt-20 space-y-4">
      <p className="text-gray-700">Looks like you’re not signed in.</p>
      <a
        href="http://localhost:5000/api/auth/google"
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
      >
        Sign in with Google
      </a>
    </div>
  );
}
