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
  Paper, // For side panels
  List,
  ListItem,
  ListItemText,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';

import TableCard from '../components/TableCard'; // Assuming this is your existing TableCard

// Framer Motion Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { delayChildren: 0.005, staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

// Simple component to display a list of students
const StudentList = ({ students, title }) => (
  <Paper elevation={2} sx={{ p: 2, maxHeight: 300, overflow: 'auto' }}>
    <Typography variant="subtitle1" gutterBottom>{title}</Typography>
    {students && students.length > 0 ? (
      <List dense>
        {students.map((s) => (
          <ListItem key={s.id} disablePadding>
            <ListItemText primary={`${s.first_name} ${s.last_name}`} />
          </ListItem>
        ))}
      </List>
    ) : (
      <Typography variant="body2" color="text.secondary">No students currently at this table.</Typography>
    )}
  </Paper>
);


function StudentDashboard() {
  const [studentInfo, setStudentInfo] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const [allTables, setAllTables] = useState([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tablesError, setTablesError] = useState('');

  const [myCurrentTableDetails, setMyCurrentTableDetails] = useState(null);
  const [myTableLoading, setMyTableLoading] = useState(false);

  const [viewingTableDetails, setViewingTableDetails] = useState(null);
  const [viewingTableLoading, setViewingTableLoading] = useState(false);
  const [viewingTableError, setViewingTableError] = useState('');

  const [confirmSeatLoading, setConfirmSeatLoading] = useState(false);
  const [confirmSeatError, setConfirmSeatError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Fetch all tables (center panel)
  const fetchAllTables = useCallback(async () => {
    setTablesLoading(true);
    setTablesError('');
    try {
      const response = await apiClient.get('/api/tables');
      setAllTables(response.data?.tables || []);
    } catch (error) {
      setTablesError(error.response?.data?.message || 'Failed to load tables.');
      setAllTables([]);
    } finally {
      setTablesLoading(false);
    }
  }, []);

  // Fetch details (including students) for a specific table ID
  const fetchTableOccupants = useCallback(async (tableId, type) => {
    if (!tableId) {
      if (type === 'myTable') setMyCurrentTableDetails(null);
      if (type === 'viewingTable') setViewingTableDetails(null);
      return;
    }

    if (type === 'myTable') setMyTableLoading(true);
    if (type === 'viewingTable') {
      setViewingTableLoading(true);
      setViewingTableError('');
    }

    try {
      const response = await apiClient.get(`/api/tables/${tableId}/students`);
      if (type === 'myTable') {
        setMyCurrentTableDetails({
          table_id: response.data.table_id,
          table_number: response.data.table_number,
          students: response.data.students || [],
        });
      } else if (type === 'viewingTable') {
        // Combine with existing table info for capacity etc.
        const baseTableInfo = allTables.find(t => t.id === tableId);
        setViewingTableDetails({
          ...(baseTableInfo || {}), // Spread base info like capacity, is_full
          table_id: response.data.table_id, // from new endpoint
          table_number: response.data.table_number, // from new endpoint
          students: response.data.students || [], // from new endpoint
        });
      }
    } catch (error) {
      if (type === 'myTable') { /* Silently fail or simple log for student's own table */ }
      if (type === 'viewingTable') {
        setViewingTableError(error.response?.data?.message || `Failed to load details for table.`);
        setViewingTableDetails(null);
      }
    } finally {
      if (type === 'myTable') setMyTableLoading(false);
      if (type === 'viewingTable') setViewingTableLoading(false);
    }
  }, [allTables]); // Depends on allTables to merge info for viewingTableDetails

  // Initial auth check and data load
  useEffect(() => {
    const verifySessionAndLoadData = async () => {
      setAuthLoading(true);
      setTablesError('');
      const passedUserInfo = location.state?.userInfo;

      if (passedUserInfo && passedUserInfo.user_type === 'student' && passedUserInfo.id) {
        setStudentInfo(passedUserInfo);
        await fetchAllTables(); // Fetch all tables first
        setAuthLoading(false);
        navigate(location.pathname, { replace: true, state: {} }); // Clear location state
        return;
      }

      try {
        const userResponse = await apiClient.get('/api/users/me');
        if (userResponse.data && userResponse.data.user_type === 'student') {
          setStudentInfo(userResponse.data);
          await fetchAllTables(); // Fetch all tables first
        } else {
          navigate('/'); // Not a student or no data, redirect
        }
      } catch (error) {
        setStudentInfo(null);
        if (error.response && error.response.status === 401) navigate('/'); // Unauthorized, redirect
        else setTablesError("Failed to verify login status.");
      } finally {
        setAuthLoading(false);
      }
    };
    verifySessionAndLoadData();
  }, [navigate, location.state, location.pathname, fetchAllTables]);

  // Effect to fetch student's current table details when studentInfo or their assigned table changes
  useEffect(() => {
    if (studentInfo && studentInfo.assigned_table_id) {
      fetchTableOccupants(studentInfo.assigned_table_id, 'myTable');
    } else {
      setMyCurrentTableDetails(null); // Not assigned to any table
    }
  }, [studentInfo, fetchTableOccupants]);


  // Handler for clicking a TableCard to view details
  const handleViewTable = (table) => {
    // Prevent selecting a full table unless it's the student's currently assigned one
    if (table.is_full && table.id !== studentInfo?.assigned_table_id) {
        setSnackbarMessage(`Table ${table.table_number} is full and cannot be selected.`);
        setSnackbarOpen(true);
        setViewingTableDetails(null); // Clear previous selection if any
        setViewingTableError('');
        return;
    }
    setViewingTableDetails(null); // Show loading for new selection
    setViewingTableError('');
    fetchTableOccupants(table.id, 'viewingTable');
  };

  // Handler for "Confirm Seat" button
  const handleConfirmSeat = async () => {
    if (!viewingTableDetails || !studentInfo) return;

    // Double check if table is full before confirming (in case status changed)
    if (viewingTableDetails.is_full && viewingTableDetails.table_id !== studentInfo.assigned_table_id) {
      setConfirmSeatError(`Table ${viewingTableDetails.table_number} is full.`);
      setSnackbarMessage(`Sorry, Table ${viewingTableDetails.table_number} is now full.`);
      setSnackbarOpen(true);
      fetchAllTables(); // Refresh table list as occupancy might have changed
      fetchTableOccupants(viewingTableDetails.table_id, 'viewingTable'); // Refresh current viewing table
      return;
    }

    setConfirmSeatLoading(true);
    setConfirmSeatError('');
    setSnackbarMessage('');

    try {
      const response = await apiClient.put('/api/student/me/table', {
        table_id: viewingTableDetails.table_id,
      });

      // Update studentInfo with the new assigned_table_id
      const updatedStudentInfo = { ...studentInfo, assigned_table_id: response.data.assigned_table_id };
      setStudentInfo(updatedStudentInfo); // This will trigger useEffect to update My Table panel

      setSnackbarMessage(response.data.message || 'Table selected successfully!');
      setSnackbarOpen(true);
      await fetchAllTables(); // Refresh full table list status

      // Refresh the viewing panel to show the latest state of the confirmed table
      fetchTableOccupants(response.data.assigned_table_id, 'viewingTable');
      // Also refresh "My Current Table" panel (though studentInfo change should trigger it)
      fetchTableOccupants(response.data.assigned_table_id, 'myTable');


    } catch (error) {
      const message = error.response?.data?.message || 'Failed to confirm seat.';
      if (error.response && error.response.status === 401) { // Unauthorized
        setConfirmSeatError("Authentication error. Please log in again.");
        navigate('/');
      } else {
        setConfirmSeatError(message);
        setSnackbarMessage(message); // Show error in snackbar as well
        setSnackbarOpen(true);
      }
      await fetchAllTables(); // Refresh tables on error too
      // If the viewed table still exists, refresh its details
      if(viewingTableDetails?.table_id) {
        fetchTableOccupants(viewingTableDetails.table_id, 'viewingTable');
      }
    } finally {
      setConfirmSeatLoading(false);
    }
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  const handleLogout = async () => {
    try {
      await apiClient.post('/api/logout');
    } catch (error) { /* Handle error if needed, e.g., log it */ }
    finally {
      setStudentInfo(null); // Clear student info
      navigate('/'); // Redirect to login
    }
  };

  if (authLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><CircularProgress /></Box>;
}

if (!studentInfo) {
    return <Typography sx={{ p: 4, textAlign: 'center' }}>Session invalid or expired. Please try logging in again.</Typography>;
}

return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AppBar position="static" elevation={4} sx={{ backgroundColor: '#003B5C' }}>
            <Toolbar>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}> Prom Seating Selection </Typography>
                <Typography sx={{ mr: 2 }}>{studentInfo.first_name}</Typography>
                <Button color="inherit" onClick={handleLogout}>Logout</Button>
            </Toolbar>
        </AppBar>

        <Container
            maxWidth={false}
            sx={{
                mt: 2,
                mb: 2,
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                overflowX: 'hidden',
            }}
        >
            <Grid
                container
                spacing={2}
                sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'nowrap',
                    width: '100%',
                    overflowX: 'auto',
                    flexGrow: 1,
                    minHeight: 0,
                }}
            >
                <Grid item xs={12} sm={3} md={3} sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, flexBasis: '15%', flexShrink: 1 }}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
                        <CardContent sx={{ flexGrow: 1 }}>
                            <Typography variant="h6" gutterBottom>My Current Table</Typography>
                            {myTableLoading ? <CircularProgress size={24} /> :
                                myCurrentTableDetails && myCurrentTableDetails.table_id ? (
                                    <>
                                        <Typography variant="subtitle1" color="primary">
                                            Table {myCurrentTableDetails.table_number}
                                        </Typography>
                                        <StudentList students={myCurrentTableDetails.students || []} title="My Table Occupants:" />
                                    </>
                                ) : (
                                    <Typography variant="body2" color="text.secondary">You are not currently assigned to a table.</Typography>
                                )
                            }
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={6} sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, flexBasis: '70%', flexShrink: 1 }}>
                    <Paper sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <Typography variant="h6" gutterBottom>
                            Welcome, {studentInfo.first_name} {studentInfo.last_name}!
                        </Typography>
                        <Divider sx={{ my: 1 }} />
                        <Typography component="h2" variant="h5" gutterBottom> Select Your Table </Typography>
                        {tablesLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                        ) : tablesError ? (
                            <Alert severity="error">{tablesError}</Alert>
                        ) : allTables.length === 0 ? (
                            <Typography>No tables available.</Typography>
                        ) : (
                            <motion.div
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                style={{
                                    flexGrow: 1,
                                    overflow: 'auto',
                                    minWidth: 0
                                }}
                            >
                                <Grid container spacing={1} justifyContent="center">
                                    {allTables.map((table) => (
                                        <motion.div variants={itemVariants} key={table.id}>
                                            <Grid item xs={6} sm={4} md={4} lg={3}>
                                                <TableCard
                                                    table={table}
                                                    isSelected={table.id === studentInfo.assigned_table_id}
                                                    isViewed={table.id === viewingTableDetails?.table_id}
                                                    onSelect={() => handleViewTable(table)}
                                                    disabled={table.is_full && table.id !== studentInfo.assigned_table_id}
                                                />
                                            </Grid>
                                        </motion.div>
                                    ))}
                                </Grid>
                            </motion.div>
                        )}
                    </Paper>
                </Grid>

                <Grid item xs={12} sm={3} md={3} sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, flexBasis: '15%', flexShrink: 1}}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
                        <CardContent sx={{ flexGrow: 1 }}>
                            <Typography variant="h6" gutterBottom>Table Overview</Typography>
                            {viewingTableLoading ? <CircularProgress size={24} /> :
                                viewingTableError ? <Alert severity="error" sx={{ mt: 1 }}>{viewingTableError}</Alert> :
                                    viewingTableDetails ? (
                                        <>
                                            <Typography variant="subtitle1" color="secondary">
                                                Viewing Table {viewingTableDetails.table_number}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Capacity: {viewingTableDetails.current_occupancy ?? 0} / {viewingTableDetails.capacity ?? 0}
                                                {viewingTableDetails.is_full && " (Full)"}
                                            </Typography>
                                            <StudentList students={viewingTableDetails.students || []} title="Current Occupants:" />
                                            {confirmSeatError && <Alert severity="error" sx={{ mt: 2 }}>{confirmSeatError}</Alert>}
                                        </>
                                    ) : (
                                        <Typography variant="body2" color="text.secondary">Click a table to see its details.</Typography>
                                    )
                            }
                        </CardContent>
                        {viewingTableDetails && viewingTableDetails.table_id !== studentInfo.assigned_table_id && !viewingTableDetails.is_full && (
                            <CardActions sx={{ justifyContent: 'center', p: 2, mt: 'auto' }}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleConfirmSeat}
                                    disabled={confirmSeatLoading}
                                >
                                    {confirmSeatLoading ? <CircularProgress size={20} color="inherit" /> : "Confirm Seat Here"}
                                </Button>
                            </CardActions>
                        )}
                        {viewingTableDetails && viewingTableDetails.is_full && viewingTableDetails.table_id !== studentInfo.assigned_table_id && (
                            <Typography variant="body2" color="error" align="center" sx={{ p: 2, mt: 'auto' }}>This table is full.</Typography>
                        )}
                        {viewingTableDetails && viewingTableDetails.table_id === studentInfo.assigned_table_id && (
                            <Typography variant="body2" color="success.main" align="center" sx={{ p: 2, mt: 'auto' }}>This is your current table.</Typography>
                        )}
                    </Card>
                </Grid>
            </Grid>
        </Container>

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
