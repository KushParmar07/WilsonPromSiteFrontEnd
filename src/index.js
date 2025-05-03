// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom';

// Import MUI components for setup
import { ThemeProvider, createTheme } from '@mui/material/styles'; 
import CssBaseline from '@mui/material/CssBaseline';
// Import specific colors
import { deepPurple, amber } from '@mui/material/colors'; 

// Define Custom Theme with Gold
const theme = createTheme({
  palette: {
    primary: {
      // main: deepPurple[700], // Example: Deep purple
       main: '#003B5C', // Example: Navy Blue
    },
    secondary: {
      // Use MUI's amber palette which looks like gold
      main: amber[700], // A rich amber/gold color
      light: amber[500],
      dark: amber[900],
    },
    background: {
       default: '#fafafa' // Slightly off-white background
    }
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}> 
      <CssBaseline /> 
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);