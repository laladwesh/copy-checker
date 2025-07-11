import React, { useState } from 'react'; // Import useState
import { Link } from 'react-router-dom';
import { ArrowRightOnRectangleIcon, UserCircleIcon } from '@heroicons/react/24/outline'; // Importing icons
import Modal from './Modal'; // Import the Modal component

export default function Navbar({ user, onLogout }) {
  const [isModalOpen, setIsModalOpen] = useState(false); // State to manage modal visibility
  const [userDetails, setUserDetails] = useState(null); // State to store user details

  // Determine the base URL for the API call based on NODE_ENV
  const apiBaseUrl = process.env.NODE_ENV === 'production'
    ? '' // Or your production backend URL
    : 'http://localhost:5000'; // Relative path for development (assuming same origin)

  const googleAuthUrl = `${apiBaseUrl}/api/auth/google`;

  const handleOpenModal = async () => {
  try {
    // Retrieve your authentication token. This often comes from localStorage
    // after a successful login. Replace 'yourAuthTokenKey' with the actual key
    // you use to store the token (e.g., 'jwtToken', 'accessToken').
    const token = localStorage.getItem('token'); 

    if (!token) {
      console.warn("No authentication token found. User details request might fail.");
      // Optionally, redirect to login or show a message
      // return; // Or handle as appropriate if a token is mandatory
    }

    const response = await fetch(`/api/auth/me`, { // Use apiBaseUrl here
      method: 'GET', // GET is the default, but it's good practice to be explicit
      headers: {
        'Content-Type': 'application/json', // Often useful, even for GET
        'Authorization': `Bearer ${token}` // Add the Authorization header
      }
    });

    if (!response.ok) {
      // Handle different status codes, e.g., 401 for unauthorized
      if (response.status === 401) {
        console.error("Unauthorized: Please log in again.");
        // Optionally, clear token and redirect to login page
        // localStorage.removeItem('yourAuthTokenKey');
        // window.location.href = '/login';
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    setUserDetails(data); // Set user details in state
    setIsModalOpen(true); // Open the modal
  } catch (error) {
    console.error("Error fetching user details:", error);
    // Optionally, show an error message to the user
  }
};

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setUserDetails(null); // Clear user details when closing the modal
  };

  return (
    <nav className="bg-white shadow-lg p-4 md:px-8 flex flex-col md:flex-row justify-between items-center rounded-b-xl sticky top-0 z-50">
      {/* Brand Logo/Link */}
      <Link to="/" className="text-3xl font-extrabold text-indigo-700 hover:text-indigo-900 transition-colors duration-300 mb-3 md:mb-0">
        Copy-Check
      </Link>

      {/* User Info and Actions */}
      <div className="flex items-center space-x-4">
        {user ? (
          <>
            {/* User Role Display - Now a button to open modal */}
            <button
              onClick={handleOpenModal} // Add onClick handler
              className="flex items-center text-lg font-semibold text-gray-700 bg-indigo-100 px-4 py-2 rounded-full shadow-inner cursor-pointer hover:bg-indigo-200 transition-colors duration-200"
            >
              <UserCircleIcon className="h-5 w-5 mr-2 text-indigo-600" />
              {user.role.toUpperCase()}
            </button>
            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="inline-flex items-center px-5 py-2 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-300 transform hover:-translate-y-0.5 hover:scale-105"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
              Logout
            </button>
          </>
        ) : (
          /* Sign In Button */
          <a
            href={googleAuthUrl}
            className="inline-flex items-center px-6 py-2 border border-transparent text-base font-medium rounded-full shadow-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 transform hover:-translate-y-0.5 hover:scale-105 group"
          >
            {/* Updated Google G icon SVG with the new path */}
            <svg className="w-5 h-5 mr-2 transition-transform duration-300 group-hover:rotate-[360deg]" viewBox="0 0 16 16" fill="currentColor">
              <path d="M15.545 6.558a9.4 9.4 0 0 1 .139 1.626c0 2.434-.87 4.492-2.384 5.885h.002C11.978 15.292 10.158 16 8 16A8 8 0 1 1 8 0a7.7 7.7 0 0 1 5.352 2.082l-2.284 2.284A4.35 4.35 0 0 0 8 3.166c-2.087 0-3.86 1.408-4.492 3.304a4.8 4.8 0 0 0 0 3.063h.003c.635 1.893 2.405 3.301 4.492 3.301 1.078 0 2.004-.276 2.722-.764h-.003a3.7 3.7 0 0 0 1.599-2.431H8v-3.08z"/>
            </svg>
            Sign in with Google
          </a>
        )}
      </div>

      {/* Modal Component */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="User Details">
        {userDetails ? (
          <div className="text-left">
            <p className="text-gray-700 text-lg mb-2"><strong>Name:</strong> {userDetails.name}</p>
            <p className="text-gray-700 text-lg mb-2"><strong>Email:</strong> {userDetails.email}</p>
            <p className="text-gray-700 text-lg mb-2"><strong>Role:</strong> {userDetails.role}</p>
            {/* Add any other user details you want to display */}
          </div>
        ) : (
          <p className="text-gray-600">Loading user details...</p>
        )}
      </Modal>
    </nav>
  );
}