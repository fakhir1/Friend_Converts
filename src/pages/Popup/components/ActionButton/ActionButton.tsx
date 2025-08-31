import React from 'react';
import './ActionButton.css';

interface ActionButtonProps {
  icon: React.ReactElement;
  label: string;
  onClick?: () => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  label,
  onClick,
}) => {
  return (
    <button className="action-button" onClick={onClick}>
      <div className="action-icon">{icon}</div>
      <span className="action-label">{label}</span>
    </button>
  );
};

export default ActionButton;
