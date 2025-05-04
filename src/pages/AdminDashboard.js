// src/pages/AdminDashboard.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// --- Import the configured axios instance ---
import apiClient from '../api/axiosConfig'; // Adjust path if needed

// --- MUI Imports ---
import { Container, Box, Typography, Button, Divider, CircularProgress, Alert, AppBar, Toolbar, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Stack, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
// --- End MUI Imports ---

function AdminDashboard() {
  // --- State Variables ---
  const [adminInfo, setAdminInfo] = useState(null); // Holds data from /api/users/me
  const [authLoading, setAuthLoading] = useState(true); // Loading state for initial auth check
  const navigate = useNavigate();

  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false); 
  const [assignmentsError, setAssignmentsError] = useState('');

  // Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const fileInputRef = useRef(null);

  // Move Modal State
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [studentToMove, setStudentToMove] = useState(null);
  const [targetTableIdInput, setTargetTableIdInput] = useState('');
  const [moveLoading, setMoveLoading] = useState(false);
  const [moveError, setMoveError] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState({ type: '', text: '' }); 

  // --- Handlers and Effects ---

  // Fetch Assignments Function
  const fetchAssignments = useCallback(async (showFeedback = false) => {
    console.log("Fetching assignments...");
    setAssignmentsLoading(true);
    setAssignmentsError('');
    if (showFeedback) setFeedbackMessage({ text: '' });
    try {
      // Use apiClient, relative path
      const response = await apiClient.get('/api/admin/assignments');
      setAssignments(response.data?.assignments || []);
      if (showFeedback) setFeedbackMessage({ type: 'success', text: 'Assignments refreshed.' });
    } catch (error) {
      console.error("Err fetch assign:", error);
      // Don't redirect here, let the initial auth check handle 401
      setAssignmentsError(error.response?.data?.message || 'Failed to load assignments.');
      setAssignments([]);
      if (showFeedback) setFeedbackMessage({ type: 'error', text: 'Failed to refresh assignments.' });
    } finally {
      setAssignmentsLoading(false);
    }
  }, []); // Removed navigate dependency

  // --- Combined Auth Check and Initial Data Fetch ---
  useEffect(() => {
    const verifySessionAndLoadData = async () => {
      console.log("Verifying session via /api/users/me...");
      setAuthLoading(true);
      setAssignmentsError(''); 
      setFeedbackMessage({ text: '' });
      try {
        // Attempt to get current user info - relies on session cookie
        const userResponse = await apiClient.get('/api/users/me');
        console.log("Auth check successful:", userResponse.data);

        // Check if the user type is correct for this dashboard
        if (userResponse.data && userResponse.data.user_type === 'admin') {
          setAdminInfo(userResponse.data); // Set admin info from backend
          // Now fetch assignments since auth succeeded
          await fetchAssignments(); 
        } else {
          // Logged in, but not as an admin/teacher
          console.warn("User is not admin type, redirecting.");
          // No need to clear localStorage as we don't rely on it
          navigate('/admin-login'); // Redirect to admin login
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setAdminInfo(null);
        // Handle 401 specifically for redirection
        if (error.response && error.response.status === 401) {
          console.log("Redirecting to login due to 401 on /api/users/me.");
          navigate('/admin-login');
        } else {
          // Show error for other issues (e.g., network error)
          setAssignmentsError("Failed to verify login status. Please try refreshing.");
        }
      } finally {
        setAuthLoading(false); // Auth check complete
      }
    };

    verifySessionAndLoadData();
  }, [navigate, fetchAssignments]); // Depend on navigate and fetchAssignments

  // --- File Upload Handlers ---
  const handleFileChange = (event) => {
      setSelectedFile(event.target.files[0]); setUploadError(''); setUploadSuccess(''); setFeedbackMessage({ text: '' });
  };

  const handleUpload = async () => {
    if (!selectedFile) { setUploadError("Please select a file first."); return; }
    setUploadLoading(true); setUploadError(''); setUploadSuccess(''); setFeedbackMessage({ text: '' });
    const formData = new FormData(); formData.append('studentFile', selectedFile);
    try {
      // Use apiClient, relative path
      const response = await apiClient.post('/api/admin/upload-students', formData, {
         headers: { 'Content-Type': 'multipart/form-data' } // Keep header for FormData
      });
      setUploadSuccess(response.data.message || "File uploaded successfully!");
      setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchAssignments(); // Refresh list
    } catch (error) {
      console.error("Upload err:", error);
      if (error.response && error.response.status === 401) {
         setUploadError("Authentication error. Please log in again.");
         navigate('/admin-login'); // Redirect on auth failure
      } else {
         setUploadError(error.response?.data?.message || 'Upload failed.');
      }
    } finally {
      setUploadLoading(false);
    }
  };

  // --- Move Student Handlers ---
  const handleMoveStudentClick = (student) => {
       if (student) { setStudentToMove(student); setTargetTableIdInput(student.assigned_table_id?.toString() ?? ''); setMoveError(''); setFeedbackMessage({ text: '' }); setIsMoveModalOpen(true); }
  };
  const handleCloseMoveModal = () => {
      if (moveLoading) return; setIsMoveModalOpen(false); setTimeout(() => { setStudentToMove(null); setTargetTableIdInput(''); setMoveError(''); }, 150);
  };
  const handleAdminMoveStudent = async (studentId, targetTableId) => {
    setMoveLoading(true); setMoveError(''); setFeedbackMessage({ text: '' });
    const payload = { student_id: studentId, table_id: targetTableId };
    try {
      // Use apiClient, relative path
      const response = await apiClient.put('/api/admin/assign', payload);
      setFeedbackMessage({ type: 'success', text: response.data.message || "Student moved." });
      handleCloseMoveModal();
      await fetchAssignments(false); // Refresh list
    } catch (error) {
      console.error("Move error:", error);
      if (error.response && error.response.status === 401) {
         setMoveError("Authentication error. Please log in again.");
         // Optionally close modal and redirect
         // handleCloseMoveModal();
         // navigate('/admin-login');
      } else {
         setMoveError(error.response?.data?.message || "Move failed.");
      }
    } finally {
      setMoveLoading(false);
    }
  };
  
  // --- Logout Handler ---
  const handleLogout = async () => {
    setFeedbackMessage({ text: '' }); // Clear feedback on logout
    try {
        // Use apiClient, relative path to call backend logout
        await apiClient.post('/api/logout');
        console.log("Logout successful on backend.");
    } catch (error) {
        console.error("Logout failed on backend:", error);
        // Proceed with frontend logout even if backend fails
    } finally {
        // Always clear local state and navigate
        setAdminInfo(null); 
        navigate('/admin-login'); 
    }
  };

  // --- Render Logic ---
  if (authLoading) {
    return ( <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}> <CircularProgress /> </Box> );
  }
  if (!adminInfo) {
     // This state is reached if /api/users/me failed (likely 401) and navigation is happening
     return <Typography sx={{p: 4}}>Session invalid or expired. Redirecting to login...</Typography>;
  }

  // Render Dashboard if authenticated and adminInfo is loaded
  return (
    // --- JSX Structure remains the same ---
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* AppBar */}
      <AppBar position="static" elevation={4} sx={{ backgroundColor: '#003B5C' }}>
         <Toolbar> 
             <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}> Admin Dashboard </Typography> 
             <Typography sx={{ mr: 2 }}>({adminInfo.role})</Typography> 
             <Button color="inherit" onClick={handleLogout}>Logout</Button> 
         </Toolbar>
      </AppBar>
      {/* Main Content */}
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Typography variant="h6" gutterBottom> 
            Welcome, {adminInfo.username === 'mbuckland' ? 'Mr. Buckland' : adminInfo.username}! 
        </Typography>
        {feedbackMessage.text && ( <Alert severity={feedbackMessage.type || 'info'} sx={{ mb: 2 }} onClose={() => setFeedbackMessage({ text: '' })}> {feedbackMessage.text} </Alert> )}
        {/* Upload Section */}
        {adminInfo.role === 'admin' && ( <Paper elevation={3} sx={{ p: 2, mb: 3 }}> 
            <Typography variant="h6" gutterBottom>Upload Student List (.xlsx)</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />} disabled={uploadLoading} > Choose File <input type="file" hidden accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleFileChange} ref={fileInputRef} /> </Button>
              {selectedFile && <Typography variant="body2" noWrap sx={{ flexShrink: 1}}>{selectedFile.name}</Typography>}
              <Button variant="contained" onClick={handleUpload} disabled={!selectedFile || uploadLoading} startIcon={uploadLoading ? <CircularProgress size={20} color="inherit" /> : null} > {uploadLoading ? 'Uploading...' : 'Upload'} </Button>
            </Stack>
            {uploadError && <Alert severity="error" sx={{ mt: 2 }}>{uploadError}</Alert>}
            {uploadSuccess && <Alert severity="success" sx={{ mt: 2 }}>{uploadSuccess}</Alert>}
        </Paper> )}
        {/* Assignments Table */}
        <Typography component="h2" variant="h5" gutterBottom sx={{ mt: 2 }}> Student Assignments </Typography>
        {assignmentsLoading ? ( <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box> ) 
         : assignmentsError ? ( <Alert severity="error">{assignmentsError}</Alert> ) 
         : ( <TableContainer component={Paper} elevation={3}> 
                <Table sx={{ minWidth: 650 }} aria-label="student assignments table">
                  <TableHead sx={{ backgroundColor: 'grey.200' }}> 
                    <TableRow> <TableCell>Last Name</TableCell> <TableCell>First Name</TableCell> <TableCell>Email</TableCell> <TableCell align="center">Assigned Table</TableCell> <TableCell align="center">Action</TableCell> </TableRow> 
                  </TableHead>
                  <TableBody>
                    {assignments.length === 0 ? ( <TableRow><TableCell colSpan={5} align="center">No students found.</TableCell></TableRow> ) 
                     : ( assignments.map((student) => ( <TableRow hover key={student.student_id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}> 
                            <TableCell>{student.last_name}</TableCell> 
                            <TableCell>{student.first_name}</TableCell> 
                            <TableCell>{student.email}</TableCell> 
                            <TableCell align="center">{student.assigned_table_number ?? 'N/A'}</TableCell> 
                            <TableCell align="center"> <IconButton aria-label="move student" size="small" onClick={() => handleMoveStudentClick(student)} color="primary" > <EditIcon fontSize="small" /> </IconButton> </TableCell> 
                          </TableRow> )) )}
                  </TableBody>
                </Table>
            </TableContainer> )}
      </Container>
      {/* Move Student Dialog */}
      <Dialog open={isMoveModalOpen} onClose={handleCloseMoveModal} aria-labelledby="move-student-dialog-title">
        {studentToMove && ( <> 
            <DialogTitle id="move-student-dialog-title"> Move {studentToMove.first_name} {studentToMove.last_name} </DialogTitle>
            <DialogContent> 
              <DialogContentText sx={{ mb: 2 }}> Current: Table {studentToMove.assigned_table_number ?? 'N/A'}. Enter new Table ID (1-55) or Unassign. </DialogContentText> 
              {moveError && <Alert severity="error" sx={{ mb: 2 }}>{moveError}</Alert>}
              <TextField autoFocus margin="dense" id="targetTableId" label="New Table ID (1-55)" type="number" fullWidth variant="standard" value={targetTableIdInput} onChange={(e) => { setMoveError(''); setTargetTableIdInput(e.target.value); }} disabled={moveLoading} error={!!moveError} inputProps={{ min: 1, max: 55 }} /> 
              {moveLoading && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}><CircularProgress size={30} /></Box>} 
            </DialogContent>
            <DialogActions sx={{ padding: '16px 24px' }}> 
              <Button onClick={() => handleAdminMoveStudent(studentToMove.student_id, null)} disabled={moveLoading || studentToMove.assigned_table_id === null} color="error" > Unassign </Button> 
              <Button onClick={handleCloseMoveModal} disabled={moveLoading}>Cancel</Button> 
              <Button onClick={() => { const targetId = parseInt(targetTableIdInput); if (targetTableIdInput === '' || isNaN(targetId) || targetId < 1 || targetId > 55) { setMoveError("Enter valid table ID (1-55)."); return; } handleAdminMoveStudent(studentToMove.student_id, targetId); }} disabled={moveLoading || targetTableIdInput === ''} variant="contained" > Confirm Move </Button> 
            </DialogActions>
          </> )}
      </Dialog>
    </Box>
  );
}

export default AdminDashboard;
