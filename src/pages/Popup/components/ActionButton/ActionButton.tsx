import React from 'react';
import './ActionButton.css';

interface ActionButtonProps {
  icon: React.ReactElement;
  label: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, label }) => {
  return (
    <button className="action-button">
      <div className="action-icon">{icon}</div>
      <span className="action-label">{label}</span>
    </button>
  );
};

export default ActionButton;
