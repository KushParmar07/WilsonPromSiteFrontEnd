// src/components/TableCard.js
import React from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';

// Added isViewed and disabled props
function TableCard({ table, isSelected, isViewed, isLoading, onSelect, disabled }) {
  const isFull = table.is_full;
  // isDisabled now primarily driven by the prop passed from parent,
  // but also considers isLoading for its own internal click protection.
  const effectivelyDisabled = disabled || isLoading;

  const handleClick = () => {
    // Only call onSelect if the card is not effectively disabled
    if (!effectivelyDisabled) {
      onSelect(table); // Pass the whole table object
    }
  };

  // Determine borderColor based on multiple states
  let borderColor = '#CCCCCC'; // Default border
  if (isFull && !isSelected && !isViewed) {
    borderColor = '#BDBDBD'; // Full and not selected/viewed
  }
  if (isViewed) {
    borderColor = '#1976D2'; // Blue for currently viewed table (example color)
  }
  if (isSelected) {
    borderColor = '#FFD700'; // Gold for student's own selected table (overrides viewed)
  }
  if (disabled && !isSelected) { // Visually more disabled if prop 'disabled' is true
      borderColor = '#E0E0E0';
  }


  // Determine background based on multiple states
  let background = '#FFFFFF'; // Default background
  if (isFull && !isSelected) {
    background = '#E0E0E0'; // Full and not selected
  }
  if (isSelected) {
    background = 'radial-gradient(circle, rgba(255,248,225,1) 0%, rgba(255,215,0,0.3) 100%)'; // Gold gradient
  } else if (isViewed) {
    background = 'rgba(25, 118, 210, 0.1)'; // Light blue tint for viewed (example)
  }
  if (disabled && !isSelected) {
      background = '#F5F5F5';
  }


  // Determine opacity
  let opacity = 1;
  if (disabled && !isSelected) { // If disabled by parent (e.g. table is full) and not student's own table
    opacity = 0.5;
  } else if (isLoading) { // If only internal loading is happening
    opacity = 0.7;
  }


  return (
    <Paper
      elevation={isSelected ? 10 : (isViewed ? 5 : 2)}
      onClick={handleClick}
      sx={{
        padding: 1,
        textAlign: 'center',
        border: '2px solid',
        borderColor: borderColor,
        background: background,
        color: isSelected ? '#333' : 'inherit',
        cursor: effectivelyDisabled ? 'not-allowed' : 'pointer',
        opacity: opacity,
        borderRadius: '64px', // Slightly less round, adjust as preferred
        width: '100px',    // Consider using theme.spacing or responsive units
        height: '100px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        transition: 'all 0.25s ease-in-out',
        '&:hover': {
          transform: !effectivelyDisabled ? 'scale(1.08)' : 'none',
          boxShadow: !effectivelyDisabled ? '0px 4px 20px 5px rgba(0,0,0,0.15)' : undefined,
        },
      }}
    >
      <Typography variant="button" component="div" sx={{ fontWeight: 'bold', lineHeight: 1.1, fontSize: '0.8rem' }}>
        Table {table.table_number}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, fontSize: '0.7rem' }}>
        {table.current_occupancy} / {table.capacity}
      </Typography>
      {isFull && (
        <Chip
          label="Full"
          size="small" // Make chip smaller
          sx={{
            position: 'absolute',
            bottom: 5,
            height: '18px', // Adjusted height
            fontSize: '0.6rem', // Adjusted font size
            color: '#FFFFFF',
            backgroundColor: disabled && !isSelected ? 'grey.500' : '#D32F2F', // Dim if disabled
            opacity: disabled && !isSelected ? 0.7 : 1,
          }}
        />
      )}
    </Paper>
  );
}

export default TableCard;