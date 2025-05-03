// src/pages/StudentDashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion'; // Import Framer Motion

// --- MUI Imports ---
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid'; 
import CircularProgress from '@mui/material/CircularProgress'; 
import Alert from '@mui/material/Alert'; 
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Snackbar from '@mui/material/Snackbar'; 
// --- End MUI Imports ---

// Import the custom TableCard component
import TableCard from '../components/TableCard'; 

// --- Framer Motion Variants (defined outside component) ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.2, 
      staggerChildren: 0.05 
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
        // type: "spring", stiffness: 90 // Optional customization
    }
  }
};
// --- End Framer Motion Variants ---


function StudentDashboard() {
  // --- State Variables ---
  const [studentInfo, setStudentInfo] = useState(null);
  const [loading, setLoading] = useState(true); // Auth check loading
  const navigate = useNavigate();

  const [tables, setTables] = useState([]);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [tablesError, setTablesError] = useState('');

  const [selectLoading, setSelectLoading] = useState(false); 
  const [selectError, setSelectError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false); // For success Snackbar
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // --- Handlers and Effects ---

  // Authentication Check useEffect
  useEffect(() => {
    const storedInfo = localStorage.getItem('studentInfo');
    if (storedInfo) {
      try {
        const parsedInfo = JSON.parse(storedInfo);
        if (parsedInfo && parsedInfo.student_id) { 
          setStudentInfo(parsedInfo); 
        } else { 
          localStorage.removeItem('studentInfo'); 
          navigate('/'); 
        }
      } catch (error) { 
        console.error("Error parsing student info", error); 
        localStorage.removeItem('studentInfo'); 
        navigate('/'); 
      }
    } else { 
      navigate('/'); 
    }
    setLoading(false);
  }, [navigate]);

  // Fetch Tables Function (using useCallback)
  const fetchTables = useCallback(async () => {
    console.log("Fetching tables..."); 
    setTablesLoading(true); 
    setTablesError('');
    try {
      const response = await axios.get('http://localhost:5000/api/tables');
      if (response.data?.tables) { 
        setTables(response.data.tables); 
      } else { 
        setTables([]); 
      }
    } catch (error) { 
      console.error('Err fetch tbl:', error); 
      setTablesError(error.response?.data?.message || 'Failed to load tables.'); 
      setTables([]); 
    } finally { 
      setTablesLoading(false); 
    }
  }, []); // Empty dependency array: function created once

  // Effect to Fetch Tables (runs after studentInfo is confirmed)
  useEffect(() => {
    if (studentInfo) { 
      fetchTables(); 
    }
  }, [studentInfo, fetchTables]); // Depends on studentInfo and fetchTables

  // Handle Table Selection
  const handleSelectTable = async (tableId) => {
    if (selectLoading || !studentInfo) return;
    console.log(`Selecting table ID: ${tableId}`);
    setSelectLoading(true); 
    setSelectError(''); 
    // Clear snackbar by setting message empty, rather than toggling open state here
    setSnackbarMessage(''); 

    try {
      const response = await axios.put('http://localhost:5000/api/student/me/table', { 
        student_id: studentInfo.student_id, table_id: tableId 
      });
      const updatedStudentInfo = { ...studentInfo, assigned_table_id: response.data.assigned_table_id };
      setStudentInfo(updatedStudentInfo);
      localStorage.setItem('studentInfo', JSON.stringify(updatedStudentInfo));
      
      // Set message and open snackbar for success
      setSnackbarMessage(response.data.message || 'Table selected successfully!'); 
      setSnackbarOpen(true); 

      await fetchTables(); // Refresh table occupancy
    } catch (error) { 
      console.error('Select error:', error); 
      setSelectError(error.response?.data?.message || 'Failed to select table.'); 
    } finally { 
        setSelectLoading(false); 
    }
  };

  // Handle Snackbar Close
  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false); 
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('studentInfo');
    navigate('/');
  };

  // --- Render Logic ---
  if (loading) { 
    return ( <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}> <CircularProgress /> </Box> ); 
  }
  if (!studentInfo) { return null; } 

  return (
    // Main wrapper Box with gradient background
    <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh', 
        background: 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)' 
      }}> 
      {/* AppBar */}
      <AppBar 
          position="static" 
          elevation={4} 
          sx={{ backgroundColor: '#003B5C' /* Navy */ }} 
      > 
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}> 
            Prom Seating Selection
          </Typography>
          {studentInfo && <Typography sx={{ mr: 2 }}>{studentInfo.first_name}</Typography>}
          <Button color="inherit" onClick={handleLogout}>Logout</Button> 
        </Toolbar>
      </AppBar>
      
      {/* Main Content Container */}
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flexGrow: 1 }}> 
         <Typography variant="h6" gutterBottom> 
             Welcome, {studentInfo.first_name} {studentInfo.last_name}!
         </Typography>
         {/* Moved selection info to top */}
         <Typography variant="body1" sx={{ mb: 2, fontWeight: 'bold', color: '#FFD700' /* Gold */ }}> 
            Your Selection: {studentInfo.assigned_table_id 
                ? `Table ${tables.find(t => t.id === studentInfo.assigned_table_id)?.table_number ?? studentInfo.assigned_table_id}` 
                : 'None'}
        </Typography>
        <Divider sx={{ my: 2 }} /> 
        
        <Typography component="h2" variant="h5" gutterBottom>
            Select Your Table
        </Typography>

        {/* Display selection error messages */}
        {selectError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSelectError('')}>{selectError}</Alert>}
        
        {/* Table Grid Area */}
        <Box sx={{ flexGrow: 1 }}>
          {tablesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
          ) : tablesError ? (
            <Alert severity="error">{tablesError}</Alert>
          ) : tables.length === 0 ? (
            <Typography>No tables available.</Typography>
          ) : (
            // Framer Motion div wrapping the Grid container for staggered animation
            <motion.div
              variants={containerVariants}
              initial="hidden" 
              animate="visible" 
            >
              <Grid container spacing={2} justifyContent="center"> 
                {tables.map((table) => (
                  // Framer Motion div wrapping each Grid item
                  <motion.div variants={itemVariants} key={table.id}> 
                    <Grid item xs={6} sm={4} md={3} lg={2}> 
                      <TableCard 
                        table={table}
                        isSelected={table.id === studentInfo.assigned_table_id}
                        isLoading={selectLoading} // Pass selection loading state
                        onSelect={handleSelectTable} // Pass handler
                      />
                    </Grid>
                  </motion.div> 
                ))}
              </Grid>
            </motion.div>
          )}
        </Box> 
        {/* Removed selection text from bottom */}
      </Container>

      {/* Snackbar for Success Feedback */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000} 
        onClose={handleSnackbarClose}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} 
      />
    </Box> 
  );
}

export default StudentDashboard;