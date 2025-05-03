// src/components/TableCard.js
import React from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
// Removed TableRestaurantIcon import

function TableCard({ table, isSelected, isLoading, onSelect }) {
  const isFull = table.is_full;
  const isDisabled = isFull || isLoading;

  const handleClick = () => {
    if (!isDisabled) {
      onSelect(table.id);
    }
  };

  // Updated sx prop directly on Paper
  return (
    <Paper
  elevation={isSelected ? 10 : 2} // Increased elevation difference
  onClick={handleClick}
  sx={{
    padding: 1,
    textAlign: 'center',
    border: '2px solid',
    borderColor: isSelected 
        ? '#FFD700' /* Gold */ 
        : (isFull ? '#BDBDBD' : '#CCCCCC'),
    background: isSelected // Using gradient now
      ? 'radial-gradient(circle, rgba(255,248,225,1) 0%, rgba(255,215,0,0.3) 100%)' 
      : (isFull ? '#E0E0E0' : '#FFFFFF'),
    color: isSelected ? '#333' : 'inherit',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled && !isFull ? 0.6 : 1, 
    borderRadius: '50%',
    width: '100px',
    height: '100px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative', 
    // Use elevation prop now for base shadow, remove boxShadow here
    transition: 'all 0.25s ease-in-out', // Refined transition
    '&:hover': { 
       // elevation prop doesn't directly work in hover via sx, manage shadow or transform
       transform: !isDisabled ? 'scale(1.1)' : (isSelected ? 'scale(1.05)' : 'scale(1)'), // Increased hover scale
       boxShadow: !isDisabled ? '0px 4px 20px 5px rgba(0,0,0,0.2)' : undefined // Example enhanced hover shadow
       // Or use elevation prop change by managing state (more complex)
    },
  }}
>
  {/* Content (Typography, Chip) */}
   <Typography variant="button" component="div" sx={{ fontWeight: 'bold', lineHeight: 1.1 }}>
        Table {table.table_number}
    </Typography>
    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>
        {table.current_occupancy} / {table.capacity}
    </Typography>
    {isFull && (
        <Chip 
           label="Full" 
           sx={{ 
               position: 'absolute', bottom: 5, height: '16px', fontSize: '0.65rem', 
               color: '#FFFFFF', backgroundColor: '#D32F2F' 
           }} 
        />
    )}
</Paper>
  );
}

export default TableCard;