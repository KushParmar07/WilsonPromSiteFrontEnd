// src/pages/AdminLoginPage.js
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Link as RouterLink } from 'react-router-dom'; 

// Import MUI components
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack'; 
import Link from '@mui/material/Link'; 

function AdminLoginPage() {
  // State variables
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate(); 

  // Login handler function
  const handleAdminLogin = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    const loginData = { username: username, password: password };
    try {
      const response = await axios.post('http://localhost:5000/api/login/admin', loginData);
      localStorage.setItem('adminInfo', JSON.stringify(response.data));
      navigate('/admin-dashboard');
    } catch (err) {
      setLoading(false); 
      const message = err.response?.data?.message || 'Login failed. Check connection or credentials.';
      setError(message);
      console.error('Admin login error:', err);
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
        <Typography component="h1" variant="h5">
          Admin / Teacher Login
        </Typography>
        <Box component="form" onSubmit={handleAdminLogin} noValidate sx={{ mt: 1, width: '100%' }}>
          <Stack spacing={2}> 
            <TextField margin="normal" required fullWidth id="username" label="Username" name="username" autoComplete="username" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} disabled={loading} />
            <TextField margin="normal" required fullWidth name="password" label="Password" type="password" id="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
            
            {error && ( <Alert severity="error" sx={{ width: '100%', mt: 1 }}>{error}</Alert> )}
            
            <Button
            type="submit"
            fullWidth
            variant="contained" 
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
          </Button>

          {/* --- NEW LINK --- */}
          <Typography align="center" variant="body2">
             <Link component={RouterLink} to="/" variant="body2">
               {"Student Login"}
             </Link>
          </Typography>
          {/* --- END LINK --- */}
          </Stack>
        </Box>
      </Box>
    </Container>
  );
}

export default AdminLoginPage;