// src/pages/StudentLoginPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link as RouterLink } from 'react-router-dom'; 

// --- Import the configured axios instance ---
import apiClient from '../api/axiosConfig'; // Adjust path if needed

// --- MUI Imports ---
import { Container, Box, Typography, TextField, Button, Alert, CircularProgress, Stack, Link } from '@mui/material';
// --- End MUI Imports ---


function StudentLoginPage() {
  // State variables remain the same
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [oen, setOen] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Login handler function
  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    const loginData = { 
      FirstName: firstName, LastName: lastName, Email: email, OEN: oen 
    };
    try {
      // Use apiClient, relative path
      const response = await apiClient.post('/api/login/student', loginData);
      console.log('Login successful:', response.data);
      
      // --- REMOVE localStorage setItem ---
      // localStorage.setItem('studentInfo', JSON.stringify(response.data)); 
      
      // Just navigate, dashboard will verify session via /api/users/me
      navigate('/dashboard'); 

    } catch (err) {
      setLoading(false); 
      const message = err.response?.data?.message || 'Login failed. Check connection or credentials.';
      setError(message);
      console.error('Login error:', err);
    }
  };

  // Render using MUI components
  return (
    <Container component="main" maxWidth="xs"> 
      <Box
        sx={{
          marginTop: 8, display: 'flex', flexDirection: 'column',
          alignItems: 'center', padding: 3, border: '1px solid',
          borderColor: 'divider', borderRadius: 2, boxShadow: 3,
        }}
      >
        <Typography component="h1" variant="h5"> Student Login </Typography>
        <Box component="form" onSubmit={handleLogin} noValidate sx={{ mt: 1, width: '100%' }}>
          <Stack spacing={2}> 
            <TextField margin="normal" required fullWidth id="firstName" label="First Name" name="firstName" autoComplete="given-name" autoFocus value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={loading} />
            <TextField margin="normal" required fullWidth id="lastName" label="Last Name" name="lastName" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={loading} />
            <TextField margin="normal" required fullWidth id="email" label="DDSB Email Address" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
            <TextField margin="normal" required fullWidth name="oen" label="OEN (Password)" type="password" id="oen" autoComplete="current-password" value={oen} onChange={(e) => setOen(e.target.value)} disabled={loading} />
            {error && ( <Alert severity="error" sx={{ width: '100%', mt: 1 }}>{error}</Alert> )}
            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={loading} >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Login'} 
            </Button>
            <Typography align="center" variant="body2">
              <Link component={RouterLink} to="/admin-login" variant="body2">
                {"Admin / Teacher Login"}
              </Link>
            </Typography>
          </Stack> 
        </Box>
      </Box>
    </Container>
  );
}

export default StudentLoginPage;
