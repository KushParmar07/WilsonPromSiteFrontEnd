// src/pages/AdminLoginPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link as RouterLink } from 'react-router-dom'; 

// --- Import the configured axios instance ---
import apiClient from '../api/axiosConfig'; // Adjust path if needed

// --- MUI Imports ---
import { Container, Box, Typography, TextField, Button, Alert, CircularProgress, Stack, Link } from '@mui/material';
// --- End MUI Imports ---

function AdminLoginPage() {
  // State variables remain the same
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate(); 

  const handleAdminLogin = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    const loginData = { username: username, password: password };

    try {
      // Use apiClient and relative path
      const response = await apiClient.post('/api/login/admin', loginData);
      console.log('Admin login API call successful:', response.data);

      // --- REMOVE localStorage setItem ---
      // localStorage.setItem('adminInfo', JSON.stringify(response.data)); 
      
      // Just navigate, dashboard will verify session via /api/users/me
      navigate('/admin-dashboard'); 

    } catch (err) {
      setLoading(false); 
      console.error('Admin login error:', err);
      const message = err.response?.data?.message || 'Login failed. Check connection or credentials.';
      setError(message);
    }
    // No need to setLoading(false) on success if navigating away
  };

  // --- Render Logic (No changes needed in JSX structure) ---
  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8, display: 'flex', flexDirection: 'column',
          alignItems: 'center', padding: 3, border: '1px solid',
          borderColor: 'divider', borderRadius: 2, boxShadow: 3,
        }}
      >
        <Typography component="h1" variant="h5"> Admin / Teacher Login </Typography>
        <Box component="form" onSubmit={handleAdminLogin} noValidate sx={{ mt: 1, width: '100%' }}>
          <Stack spacing={2}> 
            <TextField margin="normal" required fullWidth id="username" label="Username" name="username" autoComplete="username" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} disabled={loading} />
            <TextField margin="normal" required fullWidth name="password" label="Password" type="password" id="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
            {error && ( <Alert severity="error" sx={{ width: '100%', mt: 1 }}>{error}</Alert> )}
            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={loading} >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
            </Button>
            <Typography align="center" variant="body2">
              <Link component={RouterLink} to="/" variant="body2">
                {"Student Login"}
              </Link>
            </Typography>
          </Stack>
        </Box>
      </Box>
    </Container>
  );
}

export default AdminLoginPage;
