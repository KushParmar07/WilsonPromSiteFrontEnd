// src/pages/StudentLoginPage.js
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

function StudentLoginPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [oen, setOen] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Handles the student login form submission
  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    const loginData = {
      FirstName: firstName,
      LastName: lastName,
      Email: email,
      OEN: oen,
    };

    try {
      const response = await apiClient.post('/api/login/student', loginData);
      // On successful login, navigate to the student dashboard, passing user info
      // This allows the dashboard to potentially load faster without waiting for /api/users/me
      navigate('/dashboard', { state: { userInfo: response.data } });
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
        <Typography component="h1" variant="h5"> Student Login </Typography>
        <Box component="form" onSubmit={handleLogin} noValidate sx={{ mt: 1, width: '100%' }}>
          <Stack spacing={2}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="firstName"
              label="First Name"
              name="firstName"
              autoComplete="given-name"
              autoFocus
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="lastName"
              label="Last Name"
              name="lastName"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="DDSB Email Address"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="oen"
              label="OEN (Password)" // Label indicates OEN used as password
              type="password"
              id="oen"
              autoComplete="current-password"
              value={oen}
              onChange={(e) => setOen(e.target.value)}
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