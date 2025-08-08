import React from 'react';
import { motion } from 'framer-motion';

const LandingPage = () => {
  return (
    <motion.div
      className="min-h-screen flex flex-col bg-gray-50 text-gray-900"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <header className="flex items-center justify-between px-6 py-4 bg-white shadow">
        <div className="text-2xl font-semibold">CV Builder</div>
        <nav className="flex space-x-4">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:text-gray-900 transition-colors">Upload CV</button>
          <button className="px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:text-gray-900 transition-colors">Start Manually</button>
        </nav>
      </header>

      <main className="flex-grow flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
          <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
            <button className="flex-1 py-4 text-lg font-medium text-white bg-blue-600 rounded-lg shadow-md transform transition duration-200 hover:scale-105 hover:shadow-lg">
              Upload CV
            </button>
            <button className="flex-1 py-4 text-lg font-medium text-gray-700 bg-gray-200 rounded-lg shadow-md transform transition duration-200 hover:scale-105 hover:shadow-lg">
              Start Without Upload
            </button>
          </div>
        </div>
      </main>
    </motion.div>
  );
};

export default LandingPage;
