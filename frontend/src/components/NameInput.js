import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const NameInput = () => {
  const [name, setName] = useState('');
  const navigate = useNavigate();

  const handleNext = () => {
    if (!name.trim()) return;
    localStorage.setItem('player_name', name);
    navigate('/character');
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Enter Your Name</h2>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
      <button onClick={handleNext}>Next</button>
    </div>
  );
};

export default NameInput;
