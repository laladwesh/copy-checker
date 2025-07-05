import React from 'react';
import { Link } from 'react-router-dom';

export default function Navbar({ user, onLogout }) {
  return (
    <nav className="bg-white shadow p-4 flex justify-between items-center">
      <Link to="/" className="text-2xl font-bold text-indigo-600">Copy-Check</Link>
      <div>
        {user ? (
          <>
            <span className="mr-4 uppercase text-gray-700">{user.role}</span>
            <button
              onClick={onLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
            >
              Logout
            </button>
          </>
        ) : (
          <a
            href="/api/auth/google"
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
          >
            Sign in with Google
          </a>
        )}
      </div>
    </nav>
  );
}
