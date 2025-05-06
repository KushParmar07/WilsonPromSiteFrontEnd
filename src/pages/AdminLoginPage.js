// src/pages/AdminLoginPage.js
import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';

import apiClient from '../api/axiosConfig';

// MUI Imports
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Stack,
  Link,
} from '@mui/material';

function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Handles the admin login form submission
  const handleAdminLogin = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    const loginData = { username: username, password: password };

    try {
      await apiClient.post('/api/login/admin', loginData);
      // On successful login, navigate to the admin dashboard.
      // The dashboard component will verify the session.
      navigate('/admin-dashboard');
    } catch (err) {
      setLoading(false);
      // Use error message from backend response, or a default message
      const message = err.response?.data?.message || 'Login failed. Check connection or credentials.';
      setError(message);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 3,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          boxShadow: 3,
        }}
      >
        <Typography component="h1" variant="h5">
          Admin / Teacher Login
        </Typography>
        <Box component="form" onSubmit={handleAdminLogin} noValidate sx={{ mt: 1, width: '100%' }}>
          <Stack spacing={2}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            {error && (
              <Alert severity="error" sx={{ width: '100%', mt: 1 }}>
                {error}
              </Alert>
            )}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
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