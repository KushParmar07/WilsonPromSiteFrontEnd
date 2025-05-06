// src/pages/StudentDashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

import apiClient from '../api/axiosConfig';

// MUI Imports
import {
  Container,
  Box,
  Typography,
  Button,
  Divider,
  Grid,
  CircularProgress,
  Alert,
  AppBar,
  Toolbar,
  Snackbar,
} from '@mui/material';

// Import the custom TableCard component
import TableCard from '../components/TableCard';

// Framer Motion Variants for animation
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { delayChildren: 0.005, staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

function StudentDashboard() {
  const [studentInfo, setStudentInfo] = useState(null); // Holds logged-in student data
  const [authLoading, setAuthLoading] = useState(true); // Loading state for initial auth check
  const navigate = useNavigate();
  const location = useLocation(); // Used to get potential user info passed from login

  const [tables, setTables] = useState([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tablesError, setTablesError] = useState('');

  const [selectLoading, setSelectLoading] = useState(false);
  const [selectError, setSelectError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Fetches the list of tables and their occupancy
  const fetchTables = useCallback(async () => {
    setTablesLoading(true);
    setTablesError('');
    try {
      const response = await apiClient.get('/api/tables');
      setTables(response.data?.tables || []);
    } catch (error) {
      // Don't redirect here for auth errors, let the main auth check handle it
      setTablesError(error.response?.data?.message || 'Failed to load tables.');
      setTables([]);
    } finally {
      setTablesLoading(false);
    }
  }, []);

  // Verify user session and load initial data on component mount
  useEffect(() => {
    const verifySessionAndLoadData = async () => {
      setAuthLoading(true);
      setTablesError('');

      // Optimization: Check if user info was passed directly from successful login
      const passedUserInfo = location.state?.userInfo;
      if (passedUserInfo && passedUserInfo.user_type === 'student' && passedUserInfo.id) {
        setStudentInfo(passedUserInfo);
        await fetchTables(); // Fetch tables since user info is confirmed
        setAuthLoading(false);
        // Clear the location state to prevent using stale data on refresh
        navigate(location.pathname, { replace: true, state: {} });
        return;
      }

      // If no valid info from login state, verify session via backend
      try {
        const userResponse = await apiClient.get('/api/users/me');
        // Ensure user is logged in and is actually a student
        if (userResponse.data && userResponse.data.user_type === 'student') {
          setStudentInfo(userResponse.data);
          await fetchTables(); // Fetch tables now that session is verified
        } else {
          // User is logged in, but not as a student type
          navigate('/'); // Redirect to student login
        }
      } catch (error) {
        setStudentInfo(null);
        // Handle specific authentication error (401) by redirecting
        if (error.response && error.response.status === 401) {
          navigate('/'); // Redirect to student login
        } else {
          // Handle other errors (network, server error)
          setTablesError("Failed to verify login status. Please try refreshing.");
        }
      } finally {
        setAuthLoading(false);
      }
    };

    verifySessionAndLoadData();
  }, [navigate, fetchTables, location.state, location.pathname]); // Dependencies for the effect

  // Handles student selecting a table
  const handleSelectTable = async (tableId) => {
    if (selectLoading || !studentInfo) return; // Prevent action if already loading or no student info
    setSelectLoading(true);
    setSelectError('');
    setSnackbarMessage('');
    try {
      const response = await apiClient.put('/api/student/me/table', {
        table_id: tableId,
      });

      // Update student info state locally with the new assignment ID
      const updatedStudentInfo = { ...studentInfo, assigned_table_id: response.data.assigned_table_id };
      setStudentInfo(updatedStudentInfo);

      // Show success feedback
      setSnackbarMessage(response.data.message || 'Table selected successfully!');
      setSnackbarOpen(true);
      await fetchTables(); // Refresh table occupancy status
    } catch (error) {
      if (error.response && error.response.status === 401) {
        setSelectError("Authentication error. Please log in again.");
        navigate('/'); // Redirect on critical auth failure
      } else {
        setSelectError(error.response?.data?.message || 'Failed to select table.');
      }
    } finally {
      setSelectLoading(false);
    }
  };

  // Handles closing the success/feedback snackbar
  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  // Handles student logout
  const handleLogout = async () => {
    try {
      await apiClient.post('/api/logout'); // Attempt backend logout
    } catch (error) {
      // Log or handle backend logout error if desired, but proceed regardless
    } finally {
      // Always clear local state and redirect on frontend
      setStudentInfo(null);
      navigate('/');
    }
  };

  // Render loading state
  if (authLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Render message if auth failed and redirection is occurring
  if (!studentInfo) {
    return <Typography sx={{ p: 4 }}>Session invalid or expired. Redirecting to login...</Typography>;
  }

  // Render the main dashboard content
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)' }}>
      <AppBar position="static" elevation={4} sx={{ backgroundColor: '#003B5C' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}> Prom Seating Selection </Typography>
          <Typography sx={{ mr: 2 }}>{studentInfo.first_name}</Typography>
          <Button color="inherit" onClick={handleLogout}>Logout</Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Typography variant="h6" gutterBottom>
          Welcome, {studentInfo.first_name} {studentInfo.last_name}!
        </Typography>
        <Typography variant="body1" sx={{ mb: 2, fontWeight: 'bold', color: studentInfo.assigned_table_id ? 'primary.main' : 'text.secondary' }}>
          Your Selection: {studentInfo.assigned_table_id
            ? `Table ${tables.find(t => t.id === studentInfo.assigned_table_id)?.table_number ?? studentInfo.assigned_table_id}`
            : 'None'}
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Typography component="h2" variant="h5" gutterBottom> Select Your Table </Typography>
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
            <motion.div variants={containerVariants} initial="hidden" animate="visible" >
              <Grid container spacing={2} justifyContent="center">
                {tables.map((table) => (
                  <motion.div variants={itemVariants} key={table.id}>
                    <Grid item xs={6} sm={4} md={3} lg={2}>
                      <TableCard
                        table={table}
                        isSelected={table.id === studentInfo.assigned_table_id}
                        isLoading={selectLoading}
                        onSelect={handleSelectTable}
                      />
                    </Grid>
                  </motion.div>
                ))}
              </Grid>
            </motion.div>
           )}
        </Box>
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