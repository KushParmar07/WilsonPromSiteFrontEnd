// src/App.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';

// Import page components
import StudentLoginPage from './pages/StudentLoginPage';
import AdminLoginPage from './pages/AdminLoginPage';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard'; // <-- Import the new component

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<StudentLoginPage />} />
        <Route path="/admin-login" element={<AdminLoginPage />} />
        <Route path="/dashboard" element={<StudentDashboard />} />

        {/* --- NEW: Route for the Admin Dashboard --- */}
        <Route path="/admin-dashboard" element={<AdminDashboard />} />

        <Route path="*" element={<h2>Page Not Found</h2>} />
      </Routes>
    </div>
  );
}

export default App;