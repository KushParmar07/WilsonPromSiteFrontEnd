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
  CardHeader,
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
  <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', bgcolor: 'grey.100' }}>
    <AppBar position="static" sx={{ backgroundColor: '#003B5C', flexShrink: 0 }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}> Prom Seating Selection </Typography>
        <Typography sx={{ mr: 2 }}>{studentInfo.first_name}</Typography>
        <Button color="inherit" onClick={handleLogout}>Logout</Button>
      </Toolbar>
    </AppBar>

    <Container
      maxWidth={false} // Allow full width usage
      sx={{
        py: 1.5, // Adjusted padding
        px: { xs: 1, sm: 1.5 },
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column', // Container stacks its direct children vertically
        overflow: 'hidden', // Prevent this container from scrolling
        minHeight: 0,
      }}
    >
      {/* This Grid container holds the three main panels and MUST NOT WRAP for horizontal layout */}
      <Grid
        container
        spacing={1.5} // Adjusted spacing
        sx={{
          flexGrow: 1,
          flexDirection: { xs: 'column', sm: 'row' }, // Stack vertically on xs, row on sm+
          flexWrap: { xs: 'wrap', sm: 'nowrap' },   // Allow wrapping for xs, prevent for sm+
          minHeight: 0,
          height: '100%',
          overflow: { xs: 'auto', sm: 'hidden' } // Allow main container to scroll on xs if content overflows
        }}
      >
        {/* Left Panel: My Current Table */}
        <Grid item
          // Responsive column widths (out of 12)
          xs={12}    // Takes full width on extra-small screens
      sm={3}
      md={2.5}
      lg={2}
      sx={{
        display: 'flex', // Always display as flex
        flexDirection: 'column',
        minHeight: { xs: 'auto', sm: 0 }, // Adjust minHeight for xs if needed, or set to auto
        height: { xs: 'auto', sm: '100%'}, // Allow height to be auto on xs
        flexShrink: { xs: 1, sm: 0 },    // Allow shrinking on xs if needed, prevent on sm
        flexBasis: { xs: '100%', sm: '220px', md: '260px', lg: '280px' },
        maxWidth: { xs: '100%', sm: '300px', md: '350px', lg: '400px' },
        order: { xs: 1, sm: 0 } // Optional: control order on xs, e.g., show this panel first
      }}
        >
          <Card sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', boxShadow: 2, borderRadius: "12px", overflow:'hidden' }}>
            <CardHeader
              title="My Current Table"
              titleTypographyProps={{ variant: 'h6', sx: { fontSize: '1rem', color: 'white', fontWeight:'bold' } }}
              sx={{ backgroundColor: 'primary.dark', py: 1, px: 2, flexShrink: 0 }} // Darker primary for contrast
            />
            <CardContent sx={{ flexGrow: 1, overflowY: 'auto', p: 1.5 }}>
              {myTableLoading ? (
                <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80px'}}><CircularProgress size={28} /></Box>
              ) : myCurrentTableDetails && myCurrentTableDetails.table_id ? (
                  <>
                    <Typography variant="h6" color="primary.main" sx={{ fontWeight: 'bold', mb: 0.5, fontSize: '1.1rem' }}>
                      Table {myCurrentTableDetails.table_number}
                    </Typography>
                    <StudentList students={myCurrentTableDetails.students || []} title="My Table Members:" />
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{mt:1, fontStyle: 'italic'}}>You are not currently assigned to a table.</Typography>
                )
              }
            </CardContent>
          </Card>
        </Grid>

        {/* Center Panel: Table Grid */}
        <Grid item
          xs={12}
          sm={6}
          md={7}
          lg={8}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: { xs: 'auto', sm: 0 }, // Allow flexible height on xs
            flexGrow: 1,
            minWidth: 0,
            overflow: 'hidden', // This is for internal scrolling, which is good
            order: { xs: 2, sm: 0 } // Optional: if left panel is order 1, this is 2
          }}
        >
          <Paper sx={{ p: {xs: 1, sm: 1.5}, flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 1, borderRadius: "12px" }}>
            <Box sx={{ flexShrink: 0, textAlign: 'center', mb: 1 }}>
              <Typography variant="h5" gutterBottom sx={{fontSize: {xs: '1.1rem', sm: '1.3rem'}}}>
                Welcome, {studentInfo.first_name} {studentInfo.last_name}!
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <Typography component="h2" variant="h4" color="primary.dark" gutterBottom sx={{ fontWeight: 'medium', fontSize: {xs: '1.3rem', sm: '1.6rem'} }}>
                 Select Your Table
              </Typography>
            </Box>
            {tablesLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4, flexGrow: 1, alignItems: 'center' }}><CircularProgress /></Box>
            ) : tablesError ? (
              <Alert severity="error">{tablesError}</Alert>
            ) : allTables.length === 0 ? (
              <Typography sx={{ textAlign: 'center', py: 2 }}>No tables available.</Typography>
            ) : (
              // This Box is for scrolling the grid of TableCards if it overflows
              <Box sx={{ flexGrow: 1, overflow: 'auto', pt: 1, px: 0.5, // Allow both X and Y scroll for card grid
              }}>
                <motion.div variants={containerVariants} initial="hidden" animate="visible">
                  {/* The inner Grid container for TableCards will wrap naturally */}
                  <Grid container spacing={{xs: 0.5, sm: 1}} justifyContent="flex-start" alignItems="flex-start"> {/* Changed to flex-start */}
                    {allTables.map((table) => (
                      <motion.div variants={itemVariants} key={table.id}>
                        <Grid item sx={{m:0.5 /* Add small margin around each card */}}>
                          <TableCard
                            table={table}
                            isSelected={table.id === studentInfo.assigned_table_id}
                            isViewed={table.id === viewingTableDetails?.table_id}
                            onSelect={() => handleViewTable(table)}
                            disabled={table.is_full && table.id !== studentInfo.assigned_table_id}
                            isLoading={confirmSeatLoading && viewingTableDetails?.table_id === table.id}
                          />
                        </Grid>
                      </motion.div>
                    ))}
                  </Grid>
                </motion.div>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Right Panel: Selected Table Overview */}
        <Grid item
          xs={12}    // Takes full width on extra-small screens
          sm={3}
          md={2.5}
          lg={2}
          sx={{
            display: 'flex', // Always display as flex
            flexDirection: 'column',
            minHeight: { xs: 'auto', sm: 0 },
            height: { xs: 'auto', sm: '100%'},
            flexShrink: { xs: 1, sm: 0 },
            flexBasis: { xs: '100%', sm: '220px', md: '260px', lg: '280px' },
            maxWidth: { xs: '100%', sm: '300px', md: '350px', lg: '400px' },
            order: { xs: 3, sm: 0 } // Optional: if center is order 2, this is 3
          }}
        >
          <Card sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', boxShadow: 2, borderRadius: "12px", overflow: 'hidden' }}>
            <CardHeader
              title="Table Overview"
              titleTypographyProps={{ variant: 'h6', sx: { fontSize: '1rem', color: 'white', fontWeight: 'bold'} }}
              sx={{ backgroundColor: 'secondary.main', py: 1, px: 2, flexShrink: 0 }}
            />
            <CardContent sx={{ flexGrow: 1, overflowY: 'auto', p: 1.5 }}>
              {viewingTableLoading ? (
                 <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80px'}}><CircularProgress size={28} /></Box>
              ) : viewingTableError ? ( <Alert severity="error" sx={{mt:1}}>{viewingTableError}</Alert>
              ) : viewingTableDetails ? (
                  <>
                    <Typography variant="h6" color="secondary.dark" sx={{ fontWeight: 'bold', mb:0.5, fontSize: '1.1rem' }}>
                      Viewing Table {viewingTableDetails.table_number}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      Capacity: {viewingTableDetails.current_occupancy ?? 0} / {viewingTableDetails.capacity ?? 0}
                      {viewingTableDetails.is_full && " (Full)"}
                    </Typography>
                    <StudentList students={viewingTableDetails.students || []} title="Current Occupants:" />
                    {confirmSeatError && <Alert severity="error" sx={{ mt: 2 }}>{confirmSeatError}</Alert>}
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{mt:1, fontStyle: 'italic'}}>Click an available table to see its details.</Typography>
                )
              }
            </CardContent>
            {viewingTableDetails && (
              <CardActions sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider', flexShrink: 0, backgroundColor: (theme) => theme.palette.mode === 'light' ? theme.palette.grey[100] : theme.palette.grey[800] }}>
                {viewingTableDetails.table_id === studentInfo.assigned_table_id ? (
                   <Typography variant="subtitle1" color="success.dark" align="center" sx={{ fontWeight: 'medium', width:'100%' }}>This is your current table.</Typography>
                ) : viewingTableDetails.is_full ? (
                   <Typography variant="subtitle1" color="error.dark" align="center" sx={{ fontWeight: 'medium', width:'100%' }}>This table is full.</Typography>
                ) : (
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    onClick={handleConfirmSeat}
                    disabled={confirmSeatLoading}
                    sx={{py: 0.75, fontWeight: 'bold'}}
                  >
                    {confirmSeatLoading ? <CircularProgress size={24} color="inherit"/> : "Confirm Seat Here"}
                  </Button>
                )}
              </CardActions>
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
