import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ user, role, children }) {
  // If there's no user token stored, redirect to OAuth callback handler
  if (!user) {
    return <Navigate to="/auth/success" replace />;
  }
  // If the user’s role doesn’t match, show an access‐denied message
  if (user.role !== role) {
    return (
      <div className="text-center text-red-500 mt-10">
        Access Denied: You must be a&nbsp;
        <span className="font-semibold">{role}</span>
      </div>
    );
  }
  // Otherwise render the protected UI
  return children;
}
