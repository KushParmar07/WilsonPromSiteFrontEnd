// src/pages/AdminDashboard.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios'; // Use default axios for this non-secure version
import { useNavigate } from 'react-router-dom';

// --- MUI Imports ---
import { Container, Box, Typography, Button, Divider, CircularProgress, Alert, AppBar, Toolbar, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Stack, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
// --- End MUI Imports ---

function AdminDashboard() {
  // --- State Variables ---
  const [adminInfo, setAdminInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [assignmentsError, setAssignmentsError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const fileInputRef = useRef(null);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [studentToMove, setStudentToMove] = useState(null);
  const [targetTableIdInput, setTargetTableIdInput] = useState('');
  const [moveLoading, setMoveLoading] = useState(false);
  const [moveError, setMoveError] = useState(''); // Error specific to the modal
  const [feedbackMessage, setFeedbackMessage] = useState({ type: '', text: '' }); // General feedback

  // --- Handlers and Effects ---

  // Auth Check useEffect (using localStorage for non-secure version)
  useEffect(() => {
    console.log("Admin Auth Check (localStorage)");
    const storedInfo = localStorage.getItem('adminInfo');
    if (storedInfo) {
        try {
            const p = JSON.parse(storedInfo);
            // Basic check on locally stored data
            if (p?.username && p?.role) {
                setAdminInfo(p);
            } else {
                console.warn("Invalid adminInfo in localStorage");
                localStorage.removeItem('adminInfo');
                navigate('/admin-login');
            }
        } catch (e) {
            console.error("Error parsing adminInfo", e);
            localStorage.removeItem('adminInfo');
            navigate('/admin-login');
        }
    } else {
        console.log("No adminInfo in localStorage, navigating to login.");
        navigate('/admin-login');
    }
    setLoading(false); // Finished initial check
  }, [navigate]);

  // Fetch Assignments useCallback
  const fetchAssignments = useCallback(async (showFeedback = false) => {
    console.log("Fetching assignments...");
    setAssignmentsLoading(true);
    setAssignmentsError('');
    // Clear general feedback only when specifically requested (e.g., manual refresh button)
    if (showFeedback) setFeedbackMessage({ text: '' });
    try {
      // Use default axios and full URL
      const response = await axios.get('http://localhost:5000/api/admin/assignments');
      setAssignments(response.data?.assignments || []);
      if (showFeedback) setFeedbackMessage({ type: 'success', text: 'Assignments refreshed.' });
    } catch (e) {
      console.error("Error fetching assignments:", e);
      setAssignmentsError(e.response?.data?.message || 'Failed to load assignments.');
      setAssignments([]);
      // Set general feedback error only if requested, otherwise rely on assignmentsError state
      if (showFeedback) setFeedbackMessage({ type: 'error', text: 'Failed to refresh assignments.' });
    } finally {
      setAssignmentsLoading(false);
    }
  }, []); // No navigate dependency needed here

  // Effect to Fetch Assignments (run when adminInfo is confirmed)
  useEffect(() => {
    // Only fetch if adminInfo has been successfully loaded from localStorage
    if (adminInfo) {
        fetchAssignments();
    }
  }, [adminInfo, fetchAssignments]); // Depend on adminInfo state

  // --- File Upload ---
  const handleFileChange = (event) => {
      setSelectedFile(event.target.files[0]); setUploadError(''); setUploadSuccess(''); setFeedbackMessage({ text: '' });
  };

  // --- CORRECTED handleUpload ---
  const handleUpload = async () => {
    if (!selectedFile) { setUploadError("Please select a file first."); return; }
    setUploadLoading(true); setUploadError(''); setUploadSuccess(''); setFeedbackMessage({ text: '' });
    const formData = new FormData(); formData.append('studentFile', selectedFile);

    let uploadSucceeded = false; // Flag

    try {
      console.log("Attempting file upload POST...");
      // Use default axios, full URL, NO withCredentials
      const response = await axios.post('http://localhost:5000/api/admin/upload-students', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
        // Ensure 'withCredentials: true' is REMOVED
      });

      console.log("Upload POST successful:", response.data);
      // Set success state specific to upload section IMMEDIATELY
      setUploadSuccess(response.data.message || "File upload processed by server.");
      uploadSucceeded = true; // Mark upload as successful
      setSelectedFile(null); // Clear file state
      if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input visually

    } catch (error) {
      console.error("Upload POST error:", error);
      // Set the specific upload error state
      setUploadError(error.response?.data?.message || 'Upload failed.');
      uploadSucceeded = false; // Mark as failed
    } finally {
        // Set loading false for the upload action itself
        setUploadLoading(false);
    }

    // --- Refresh assignments AFTER upload attempt, only if upload succeeded ---
    if (uploadSucceeded) {
        console.log("Upload succeeded, now refreshing assignments...");
        // Call fetchAssignments without the feedback flag, as success is already shown
        await fetchAssignments(false);
        console.log("Assignment refresh attempt after upload complete.");
        // No need for separate try/catch here unless you want specific feedback for refresh failure
    }
    // --- End Refresh ---
  };
  // --- End CORRECTED handleUpload ---


  // --- Move Student Handlers (Use default axios, full URL) ---
  const handleMoveStudentClick = (student) => {
       if (student) { setStudentToMove(student); setTargetTableIdInput(student.assigned_table_id?.toString() ?? ''); setMoveError(''); setFeedbackMessage({ text: '' }); setIsMoveModalOpen(true); }
  };
  const handleCloseMoveModal = () => {
      if (moveLoading) return; setIsMoveModalOpen(false); setTimeout(() => { setStudentToMove(null); setTargetTableIdInput(''); setMoveError(''); }, 150);
  };

  // --- CORRECTED handleAdminMoveStudent ---
  const handleAdminMoveStudent = async (studentId, targetTableId) => {
    setMoveLoading(true); setMoveError(''); setFeedbackMessage({ text: '' }); // Clear previous messages
    const payload = { student_id: studentId, table_id: targetTableId };
    try {
      console.log("Attempting move student PUT:", payload);
      // Use default axios, full URL, NO withCredentials
      const response = await axios.put('http://localhost:5000/api/admin/assign', payload);

      console.log("Move student PUT successful:", response.data);
      // Set general feedback message on success
      setFeedbackMessage({ type: 'success', text: response.data.message || "Student moved successfully." });
      handleCloseMoveModal(); // Close modal ONLY on success
      await fetchAssignments(false); // Refresh list after successful move

    } catch (error) {
      console.error("Move student PUT error:", error);
      // Set the error message specific to the modal
      setMoveError(error.response?.data?.message || "Failed to move student.");
      // DO NOT close modal on error, so user can see the message
    } finally {
      setMoveLoading(false); // Stop loading indicator
    }
  };
  // --- End CORRECTED handleAdminMoveStudent ---

  // --- Logout Handler (No backend call needed without sessions) ---
  const handleLogout = () => {
    localStorage.removeItem('adminInfo');
    setAdminInfo(null);
    navigate('/admin-login');
  };

  // --- Render Logic ---
  if (loading) { return ( <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}> <CircularProgress /> </Box> ); }
  // Check adminInfo state which is set based on localStorage in useEffect
  if (!adminInfo) { return <Typography sx={{p: 4}}>Not logged in or invalid session. Redirecting...</Typography>; }

  return (
    // --- JSX Structure remains the same ---
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* AppBar */}
      <AppBar position="static" elevation={4} sx={{ backgroundColor: '#003B5C' }}>
         <Toolbar> <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}> Admin Dashboard </Typography> <Typography sx={{ mr: 2 }}>({adminInfo.role})</Typography> <Button color="inherit" onClick={handleLogout}>Logout</Button> </Toolbar>
      </AppBar>
      {/* Main Content */}
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        {/* Welcome Message */}
        <Typography variant="h6" gutterBottom> Welcome, {adminInfo.username === 'mbuckland' ? 'Mr. Buckland' : adminInfo.username}! </Typography>
        {/* General Feedback Alert */}
        {feedbackMessage.text && ( <Alert severity={feedbackMessage.type || 'info'} sx={{ mb: 2 }} onClose={() => setFeedbackMessage({ text: '' })}> {feedbackMessage.text} </Alert> )}
        {/* Upload Section */}
        {adminInfo.role === 'admin' && ( <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Upload Student List (.xlsx)</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />} disabled={uploadLoading} > Choose File <input type="file" hidden accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleFileChange} ref={fileInputRef} /> </Button>
              {selectedFile && <Typography variant="body2" noWrap sx={{ flexShrink: 1}}>{selectedFile.name}</Typography>}
              <Button variant="contained" onClick={handleUpload} disabled={!selectedFile || uploadLoading} startIcon={uploadLoading ? <CircularProgress size={20} color="inherit" /> : null} > {uploadLoading ? 'Uploading...' : 'Upload'} </Button>
            </Stack>
            {/* Specific Upload Feedback */}
            {uploadError && <Alert severity="error" sx={{ mt: 2 }}>{uploadError}</Alert>}
            {uploadSuccess && <Alert severity="success" sx={{ mt: 2 }}>{uploadSuccess}</Alert>}
        </Paper> )}
        {/* Assignments Table */}
        <Typography component="h2" variant="h5" gutterBottom sx={{ mt: 2 }}> Student Assignments </Typography>
        {assignmentsLoading ? ( <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box> )
         : assignmentsError ? ( <Alert severity="error">{assignmentsError}</Alert> )
         : ( <TableContainer component={Paper} elevation={3}>
                <Table sx={{ minWidth: 650 }} aria-label="student assignments table">
                  <TableHead sx={{ backgroundColor: 'grey.200' }}> <TableRow> <TableCell>Last Name</TableCell> <TableCell>First Name</TableCell> <TableCell>Email</TableCell> <TableCell align="center">Assigned Table</TableCell> <TableCell align="center">Action</TableCell> </TableRow> </TableHead>
                  <TableBody>
                    {assignments.length === 0 ? ( <TableRow><TableCell colSpan={5} align="center">No students found.</TableCell></TableRow> )
                     : ( assignments.map((student) => ( <TableRow hover key={student.student_id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}> <TableCell>{student.last_name}</TableCell> <TableCell>{student.first_name}</TableCell> <TableCell>{student.email}</TableCell> <TableCell align="center">{student.assigned_table_number ?? 'N/A'}</TableCell> <TableCell align="center"> <IconButton aria-label="move student" size="small" onClick={() => handleMoveStudentClick(student)} color="primary" > <EditIcon fontSize="small" /> </IconButton> </TableCell> </TableRow> )) )}
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
              {/* Display move error specific to modal */}
              {moveError && <Alert severity="error" sx={{ mb: 2 }}>{moveError}</Alert>}
              <TextField autoFocus margin="dense" id="targetTableId" label="New Table ID (1-55)" type="number" fullWidth variant="standard" value={targetTableIdInput} onChange={(e) => { setMoveError(''); setTargetTableIdInput(e.target.value); }} disabled={moveLoading} error={!!moveError} /* helperText={moveError} - Don't show helper text if Alert is used */ inputProps={{ min: 1, max: 55 }} />
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
