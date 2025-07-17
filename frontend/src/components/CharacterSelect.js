import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CHARACTER_OPTIONS } from '../characterData';

const CharacterSelect = () => {
  const navigate = useNavigate();

  const handleSelect = (char) => {
    localStorage.setItem('character_id', char.id);
    localStorage.setItem('character_hp', char.hp);
    localStorage.setItem('character_attack', char.attack);
    navigate('/lobby');
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Select Your Character</h2>
      <div style={{ display: 'flex', gap: '20px' }}>
        {CHARACTER_OPTIONS.map(char => (
          <div
            key={char.id}
            onClick={() => handleSelect(char)}
            style={{ border: '1px solid #ccc', padding: 10, cursor: 'pointer' }}
          >
            <h3>{char.name}</h3>
            <p>HP: {char.hp}</p>
            <p>Attack: {char.attack}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CharacterSelect;
