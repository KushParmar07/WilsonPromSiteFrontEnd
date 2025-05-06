// src/pages/AdminDashboard.js
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import apiClient from '../api/axiosConfig';

// MUI Imports
import {
  Container,
  Box,
  Typography,
  Button,
  Divider,
  CircularProgress,
  Alert,
  AppBar,
  Toolbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Stack,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  TableSortLabel,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

function AdminDashboard() {
  // State Variables
  const [adminInfo, setAdminInfo] = useState(null); // Holds logged-in admin data
  const [authLoading, setAuthLoading] = useState(true); // Loading state for initial auth check
  const navigate = useNavigate();

  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentsError, setAssignmentsError] = useState('');

  const [sortConfig, setSortConfig] = useState({ key: 'last_name', direction: 'ascending' });

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

  // Handlers and Effects

  // Fetch Assignments Function
  const fetchAssignments = useCallback(async (showFeedback = false) => {
    setAssignmentsLoading(true);
    setAssignmentsError('');
    if (showFeedback) setFeedbackMessage({ text: '' });
    try {
      const response = await apiClient.get('/api/admin/assignments');
      setAssignments(response.data?.assignments || []);
      if (showFeedback) setFeedbackMessage({ type: 'success', text: 'Assignments refreshed.' });
    } catch (error) {
      setAssignmentsError(error.response?.data?.message || 'Failed to load assignments.');
      setAssignments([]);
      if (showFeedback) setFeedbackMessage({ type: 'error', text: 'Failed to refresh assignments.' });
    } finally {
      setAssignmentsLoading(false);
    }
  }, []);

  // Verify user session and load initial data on component mount
  useEffect(() => {
    const verifySessionAndLoadData = async () => {
      setAuthLoading(true);
      setAssignmentsError('');
      setFeedbackMessage({ text: '' });
      try {
        const userResponse = await apiClient.get('/api/users/me');
        // Ensure user is logged in and has the 'admin' type for this dashboard
        if (userResponse.data && userResponse.data.user_type === 'admin') {
          setAdminInfo(userResponse.data);
          await fetchAssignments();
        } else {
          navigate('/admin-login'); // Redirect if not admin
        }
      } catch (error) {
        setAdminInfo(null);
        if (error.response && error.response.status === 401) {
          navigate('/admin-login'); // Redirect if session is invalid/expired
        } else {
          setAssignmentsError("Failed to verify login status. Please try refreshing.");
        }
      } finally {
        setAuthLoading(false);
      }
    };
    verifySessionAndLoadData();
  }, [navigate, fetchAssignments]);

  // Memoized sorting logic for the assignments table
  const sortedAssignments = useMemo(() => {
    if (!assignments) return [];
    let sortableItems = [...assignments];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const key = sortConfig.key;
        const direction = sortConfig.direction;

        let valA = a[key];
        let valB = b[key];

        // Specific handling for 'assigned_table_number' to put nulls (N/A) last
        if (key === 'assigned_table_number') {
          const aIsNull = valA === null || valA === undefined;
          const bIsNull = valB === null || valB === undefined;

          if (aIsNull && bIsNull) return 0; // Both null
          if (aIsNull) return 1; // Only A is null, A comes after B
          if (bIsNull) return -1; // Only B is null, B comes after A

          // If neither is null, compare as numbers
          valA = Number(valA);
          valB = Number(valB);
        }

        // General comparison
        let comparison = 0;
        if (valA < valB) {
          comparison = -1;
        } else if (valA > valB) {
          comparison = 1;
        }

        // Apply direction
        return direction === 'ascending' ? comparison : comparison * -1;
      });
    }
    return sortableItems;
  }, [assignments, sortConfig]);

  // File Upload Handlers
  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setUploadError('');
    setUploadSuccess('');
    setFeedbackMessage({ text: '' });
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError("Please select a file first.");
      return;
    }
    setUploadLoading(true);
    setUploadError('');
    setUploadSuccess('');
    setFeedbackMessage({ text: '' });
    const formData = new FormData();
    formData.append('studentFile', selectedFile);
    try {
      const response = await apiClient.post('/api/admin/upload-students', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadSuccess(response.data.message || "File uploaded successfully!");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
      await fetchAssignments(); // Refresh list after upload
    } catch (error) {
      if (error.response && error.response.status === 401) {
        setUploadError("Authentication error. Please log in again.");
        navigate('/admin-login');
      } else {
        setUploadError(error.response?.data?.message || 'Upload failed.');
      }
    } finally {
      setUploadLoading(false);
    }
  };

  // Move Student Handlers
  const handleMoveStudentClick = (student) => {
    if (student) {
      setStudentToMove(student);
      setTargetTableIdInput(student.assigned_table_id?.toString() ?? '');
      setMoveError('');
      setFeedbackMessage({ text: '' });
      setIsMoveModalOpen(true);
    }
  };

  const handleCloseMoveModal = () => {
    if (moveLoading) return; // Prevent closing while move is in progress
    setIsMoveModalOpen(false);
    // Delay reset slightly for modal closing animation
    setTimeout(() => {
      setStudentToMove(null);
      setTargetTableIdInput('');
      setMoveError('');
    }, 150);
  };

  const handleAdminMoveStudent = async (studentId, targetTableId) => {
    setMoveLoading(true);
    setMoveError('');
    setFeedbackMessage({ text: '' });
    const payload = { student_id: studentId, table_id: targetTableId };
    try {
      const response = await apiClient.put('/api/admin/assign', payload);
      setFeedbackMessage({ type: 'success', text: response.data.message || "Student moved." });
      handleCloseMoveModal();
      await fetchAssignments(false); // Refresh list without feedback snackbar
    } catch (error) {
      if (error.response && error.response.status === 401) {
        setMoveError("Authentication error. Please log in again.");
      } else {
        setMoveError(error.response?.data?.message || "Move failed.");
      }
    } finally {
      setMoveLoading(false);
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    setFeedbackMessage({ text: '' });
    try {
      await apiClient.post('/api/logout');
    } catch (error) {
      // Handle backend logout error if needed, but proceed with frontend logout
    } finally {
      setAdminInfo(null);
      navigate('/admin-login');
    }
  };

  // Sort Request Handler
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    } else if (sortConfig.key !== key) {
      direction = 'ascending';
    }
    setSortConfig({ key, direction });
  };

  // Render Logic
  if (authLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (!adminInfo) {
    return <Typography sx={{ p: 4 }}>Session invalid or expired. Redirecting...</Typography>;
  }

  // Render Admin Dashboard
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" elevation={4} sx={{ backgroundColor: '#003B5C' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}> Admin Dashboard </Typography>
          <Typography sx={{ mr: 2 }}>{adminInfo.username === 'mbuckland' ? "Mr. Buckland" : "Staff"}</Typography>
          <Button color="inherit" onClick={handleLogout}>Logout</Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Typography variant="h6" gutterBottom>
          Welcome, {adminInfo.username === 'mbuckland' ? 'Mr. Buckland' : "Staff"}!
        </Typography>
        {feedbackMessage.text && (
          <Alert severity={feedbackMessage.type || 'info'} sx={{ mb: 2 }} onClose={() => setFeedbackMessage({ text: '' })}>
            {feedbackMessage.text}
          </Alert>
        )}

        {/* Upload Section - Only show for 'admin' role */}
        {adminInfo.role === 'admin' && (
          <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Upload Student List (.xlsx)</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />} disabled={uploadLoading}>
                Choose File
                <input
                  type="file"
                  hidden
                  accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                />
              </Button>
              {selectedFile && <Typography variant="body2" noWrap sx={{ flexShrink: 1 }}>{selectedFile.name}</Typography>}
              <Button
                variant="contained"
                onClick={handleUpload}
                disabled={!selectedFile || uploadLoading}
                startIcon={uploadLoading ? <CircularProgress size={20} color="inherit" /> : null}
              >
                {uploadLoading ? 'Uploading...' : 'Upload'}
              </Button>
            </Stack>
            {uploadError && <Alert severity="error" sx={{ mt: 2 }}>{uploadError}</Alert>}
            {uploadSuccess && <Alert severity="success" sx={{ mt: 2 }}>{uploadSuccess}</Alert>}
          </Paper>
        )}

        {/* Assignments Table */}
        <Typography component="h2" variant="h5" gutterBottom sx={{ mt: 2 }}> Student Assignments </Typography>
        {assignmentsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : assignmentsError ? (
          <Alert severity="error">{assignmentsError}</Alert>
        ) : (
          <TableContainer component={Paper} elevation={3}>
            <Table sx={{ minWidth: 750 }} aria-label="student assignments table">
              <TableHead sx={{ backgroundColor: 'grey.200' }}>
                <TableRow>
                  <TableCell sortDirection={sortConfig.key === 'last_name' ? sortConfig.direction : false}>
                    <TableSortLabel
                      active={sortConfig.key === 'last_name'}
                      direction={sortConfig.key === 'last_name' ? sortConfig.direction : 'asc'}
                      onClick={() => requestSort('last_name')}
                      IconComponent={sortConfig.key === 'last_name' ? (sortConfig.direction === 'descending' ? ArrowDownwardIcon : ArrowUpwardIcon) : undefined}
                    >
                      Last Name
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={sortConfig.key === 'first_name' ? sortConfig.direction : false}>
                    <TableSortLabel
                      active={sortConfig.key === 'first_name'}
                      direction={sortConfig.key === 'first_name' ? sortConfig.direction : 'asc'}
                      onClick={() => requestSort('first_name')}
                      IconComponent={sortConfig.key === 'first_name' ? (sortConfig.direction === 'descending' ? ArrowDownwardIcon : ArrowUpwardIcon) : undefined}
                    >
                      First Name
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell align="center" sortDirection={sortConfig.key === 'assigned_table_number' ? sortConfig.direction : false}>
                    <TableSortLabel
                      active={sortConfig.key === 'assigned_table_number'}
                      direction={sortConfig.key === 'assigned_table_number' ? sortConfig.direction : 'asc'}
                      onClick={() => requestSort('assigned_table_number')}
                      IconComponent={sortConfig.key === 'assigned_table_number' ? (sortConfig.direction === 'descending' ? ArrowDownwardIcon : ArrowUpwardIcon) : undefined}
                    >
                      Assigned Table
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedAssignments.length === 0 ? (
                  <TableRow><TableCell colSpan={6} align="center">No students found.</TableCell></TableRow>
                 ) : (
                   sortedAssignments.map((student) => (
                     <TableRow hover key={student.student_id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                       <TableCell>{student.last_name}</TableCell>
                       <TableCell>{student.first_name}</TableCell>
                       <TableCell>{student.email}</TableCell>
                       <TableCell align="center">{student.assigned_table_number ?? 'N/A'}</TableCell>
                       <TableCell align="center">
                         <IconButton aria-label="move student" size="small" onClick={() => handleMoveStudentClick(student)} color="primary">
                           <EditIcon fontSize="small" />
                         </IconButton>
                       </TableCell>
                     </TableRow>
                   ))
                 )}
              </TableBody>
            </Table>
          </TableContainer>
         )}
      </Container>

      {/* Move Student Dialog */}
      <Dialog open={isMoveModalOpen} onClose={handleCloseMoveModal} aria-labelledby="move-student-dialog-title">
        {studentToMove && (
          <>
            <DialogTitle id="move-student-dialog-title"> Move {studentToMove.first_name} {studentToMove.last_name} </DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ mb: 2 }}>
                Current: Table {studentToMove.assigned_table_number ?? 'N/A'}. Enter new Table ID (1-55) or Unassign.
              </DialogContentText>
              {moveError && <Alert severity="error" sx={{ mb: 2 }}>{moveError}</Alert>}
              <TextField
                autoFocus
                margin="dense"
                id="targetTableId"
                label="New Table ID (1-55)"
                type="number"
                fullWidth
                variant="standard"
                value={targetTableIdInput}
                onChange={(e) => { setMoveError(''); setTargetTableIdInput(e.target.value); }}
                disabled={moveLoading}
                error={!!moveError}
                inputProps={{ min: 1, max: 55 }}
              />
              {moveLoading && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}><CircularProgress size={30} /></Box>}
            </DialogContent>
            <DialogActions sx={{ padding: '16px 24px' }}>
              <Button onClick={() => handleAdminMoveStudent(studentToMove.student_id, null)} disabled={moveLoading || studentToMove.assigned_table_id === null} color="error">
                Unassign
              </Button>
              <Button onClick={handleCloseMoveModal} disabled={moveLoading}>Cancel</Button>
              <Button
                onClick={() => {
                  const targetId = parseInt(targetTableIdInput);
                  if (targetTableIdInput === '' || isNaN(targetId) || targetId < 1 || targetId > 55) {
                    setMoveError("Enter valid table ID (1-55).");
                    return;
                  }
                  handleAdminMoveStudent(studentToMove.student_id, targetId);
                }}
                disabled={moveLoading || targetTableIdInput === ''}
                variant="contained"
              >
                Confirm Move
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

export default AdminDashboard;