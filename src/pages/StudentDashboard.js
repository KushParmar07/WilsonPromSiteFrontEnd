// src/pages/StudentDashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; 
import { motion } from 'framer-motion'; 

// --- Import the configured axios instance ---
import apiClient from '../api/axiosConfig'; // Adjust path if needed

// --- MUI Imports ---
import { Container, Box, Typography, Button, Divider, Grid, CircularProgress, Alert, AppBar, Toolbar, Snackbar } from '@mui/material';
// --- End MUI Imports ---

// Import the custom TableCard component
import TableCard from '../components/TableCard'; 

// --- Framer Motion Variants ---
const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { delayChildren: 0.2, staggerChildren: 0.05 } } };
const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { /* type: "spring", stiffness: 90 */ } } };
// --- End Variants ---


function StudentDashboard() {
  // --- State Variables ---
  const [studentInfo, setStudentInfo] = useState(null); // Holds data from /api/users/me or login redirect
  const [authLoading, setAuthLoading] = useState(true); // Auth check loading
  const navigate = useNavigate();
  const location = useLocation(); // Get location state passed from login

  const [tables, setTables] = useState([]);
  const [tablesLoading, setTablesLoading] = useState(false); 
  const [tablesError, setTablesError] = useState('');

  const [selectLoading, setSelectLoading] = useState(false); 
  const [selectError, setSelectError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false); 
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // --- Handlers and Effects ---

  // Fetch Tables Function
  const fetchTables = useCallback(async () => { 
    console.log("Fetching tables..."); setTablesLoading(true); setTablesError('');
    try { 
        // Use apiClient, relative path
        const response = await apiClient.get('/api/tables'); 
        setTables(response.data?.tables || []); 
    } catch (error) { 
        console.error('Err fetch tbl:', error); 
        // Don't redirect here, let auth check handle 401
        setTablesError(error.response?.data?.message || 'Failed to load tables.'); 
        setTables([]); 
    } finally { 
        setTablesLoading(false); 
    }
  }, []); 

  // --- Combined Auth Check and Initial Data Fetch ---
  useEffect(() => {
    const verifySessionAndLoadData = async () => {
      console.log("Verifying session or using location state...");
      setAuthLoading(true);
      setTablesError(''); 

      // --- Check location state first (passed from login) ---
      const passedUserInfo = location.state?.userInfo;
      // Validate the passed info more strictly
      if (passedUserInfo && passedUserInfo.user_type === 'student' && passedUserInfo.id) {
          console.log("Using user info passed from login:", passedUserInfo);
          setStudentInfo(passedUserInfo); // Use data directly from login response
          await fetchTables(); // Fetch tables now
          setAuthLoading(false); 
          // Clear location state after using it
          navigate(location.pathname, { replace: true, state: {} }); 
          return; // Exit early
      }
      
      // --- If no valid state, verify session with backend ---
      console.log("No valid location state, verifying session via /api/users/me...");
      try {
        const userResponse = await apiClient.get('/api/users/me');
        console.log("Auth check successful (/api/users/me):", userResponse.data);
        
        // Check if the user type returned is correct for this dashboard
        if (userResponse.data && userResponse.data.user_type === 'student') {
          setStudentInfo(userResponse.data); // Set student info from backend session
          await fetchTables(); // Fetch tables now
        } else {
          // Logged in, but not as a student (or unexpected data)
          console.warn("User from session is not student type, redirecting.");
          navigate('/'); // Redirect to student login
        }
      } catch (error) {
        console.error("Auth check via /api/users/me failed:", error);
        setStudentInfo(null);
        // Handle 401 specifically for redirection
        if (error.response && error.response.status === 401) {
          console.log("Redirecting to login due to 401 on /api/users/me.");
          navigate('/'); // Redirect to student login
        } else {
          // Show error for other issues (e.g., network error)
          setTablesError("Failed to verify login status. Please try refreshing.");
        }
      } finally {
        setAuthLoading(false); // Auth check complete
      }
    };

    verifySessionAndLoadData();
  // Depend on navigate, fetchTables, and location.state/pathname
  }, [navigate, fetchTables, location.state, location.pathname]); 
  // --- End Auth Check ---

  // --- Handle Table Selection ---
  const handleSelectTable = async (tableId) => { 
    if (selectLoading || !studentInfo) return;
    setSelectLoading(true); setSelectError(''); setSnackbarMessage(''); 
    try {
      // Use apiClient, relative path
      // IMPORTANT: Only send table_id in payload now
      const response = await apiClient.put('/api/student/me/table', { 
        table_id: tableId 
      }); 
      
      // Update local state with the new assignment ID from response
      const updatedStudentInfo = { ...studentInfo, assigned_table_id: response.data.assigned_table_id };
      setStudentInfo(updatedStudentInfo);
      
      setSnackbarMessage(response.data.message || 'Table selected successfully!'); 
      setSnackbarOpen(true); 
      await fetchTables(); // Refresh table occupancy
    } catch (error) { 
      console.error('Select error:', error); 
      if (error.response && error.response.status === 401) { 
          setSelectError("Authentication error. Please log in again.");
          navigate('/'); // Redirect on auth failure
      } else { 
          setSelectError(error.response?.data?.message || 'Failed to select table.'); 
      }
    } finally { 
        setSelectLoading(false); 
    }
  };

  // --- Handle Snackbar Close ---
  const handleSnackbarClose = (event, reason) => { 
      if (reason === 'clickaway') { return; } setSnackbarOpen(false); 
  };

  // --- Handle Logout ---
  const handleLogout = async () => {
    try {
        // Use apiClient, relative path
        await apiClient.post('/api/logout');
        console.log("Logout successful on backend.");
    } catch (error) {
        console.error("Logout failed on backend:", error);
    } finally {
        // Always clear local state and redirect
        setStudentInfo(null); 
        navigate('/'); // Redirect to student login
    }
  };

  // --- Render Logic ---
  if (authLoading) { 
    return ( <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}> <CircularProgress /> </Box> ); 
  }
  if (!studentInfo) { 
     // This state is reached if /api/users/me failed (likely 401) and navigation is happening
     return <Typography sx={{p: 4}}>Session invalid or expired. Redirecting to login...</Typography>;
  }

  // --- Render Dashboard JSX (No changes needed in structure) ---
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)' }}> 
      {/* AppBar */}
      <AppBar position="static" elevation={4} sx={{ backgroundColor: '#003B5C' }}> 
        <Toolbar> <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}> Prom Seating Selection </Typography> <Typography sx={{ mr: 2 }}>{studentInfo.first_name}</Typography> <Button color="inherit" onClick={handleLogout}>Logout</Button> </Toolbar>
      </AppBar>
      {/* Main Content Container */}
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flexGrow: 1 }}> 
         <Typography variant="h6" gutterBottom> Welcome, {studentInfo.first_name} {studentInfo.last_name}! </Typography>
         <Typography variant="body1" sx={{ mb: 2, fontWeight: 'bold', color: '#FFD700' }}> Your Selection: {studentInfo.assigned_table_id ? `Table ${tables.find(t => t.id === studentInfo.assigned_table_id)?.table_number ?? studentInfo.assigned_table_id}` : 'None'} </Typography>
        <Divider sx={{ my: 2 }} /> 
        <Typography component="h2" variant="h5" gutterBottom> Select Your Table </Typography>
        {selectError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSelectError('')}>{selectError}</Alert>}
        {/* Table Grid Area */}
        <Box sx={{ flexGrow: 1 }}>
          {tablesLoading ? ( <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box> ) 
           : tablesError ? ( <Alert severity="error">{tablesError}</Alert> ) 
           : tables.length === 0 ? ( <Typography>No tables available.</Typography> ) 
           : ( <motion.div variants={containerVariants} initial="hidden" animate="visible" >
                 <Grid container spacing={2} justifyContent="center"> 
                   {tables.map((table) => ( <motion.div variants={itemVariants} key={table.id}> <Grid item xs={6} sm={4} md={3} lg={2}> <TableCard table={table} isSelected={table.id === studentInfo.assigned_table_id} isLoading={selectLoading} onSelect={handleSelectTable} /> </Grid> </motion.div> ))}
                 </Grid>
               </motion.div> )}
        </Box> 
      </Container>
      {/* Snackbar for Success Feedback */}
      <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={handleSnackbarClose} message={snackbarMessage} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box> 
  );
}

export default StudentDashboard;
