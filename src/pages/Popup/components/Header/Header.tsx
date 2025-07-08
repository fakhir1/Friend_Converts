import React from 'react';
import { FiMenu } from 'react-icons/fi';
import { FaTimes } from 'react-icons/fa';
import { GoHomeFill } from 'react-icons/go';
import { RiDeleteBin5Fill } from 'react-icons/ri';
import { FiLogOut } from 'react-icons/fi';
import ActionButton from '../ActionButton/ActionButton';
//@ts-ignore
import friendConvert from '../../../../assets/img/friendConvert.png';
import './Header.css';
import { useState } from 'react';
import { BsGrid, BsListUl } from 'react-icons/bs';
import { FaUserFriends, FaUserPlus } from 'react-icons/fa';

const actions = [
  {
    icon: React.createElement(GoHomeFill as any, {
      size: 20,
      color: '#606060',
    }),
    label: 'Home',
  },
  {
    icon: React.createElement(BsGrid as any, { size: 20, color: '#606060' }),
    label: 'Friends impressions dashboard',
  },
  {
    icon: React.createElement(BsListUl as any, { size: 20, color: '#606060' }),
    label: 'Non-friends impressions dashboard',
  },
  {
    icon: React.createElement(FaUserFriends as any, {
      size: 20,
      color: '#606060',
    }),
    label: "Send friend requests to friend's friends",
  },
  {
    icon: React.createElement(RiDeleteBin5Fill as any, {
      size: 20,
      color: '#606060',
    }),
    label: 'Delete unaccepted friend requests',
  },
  {
    icon: React.createElement(FaUserPlus as any, {
      size: 20,
      color: '#606060',
    }),
    label: 'Add targeted friends',
  },
  {
    icon: React.createElement(FiLogOut as any, {
      size: 20,
      color: '#606060',
    }),
    label: 'Logout',
  },
];

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  return (
    <header className="header">
      <div className="logo">
        <img
          src={friendConvert}
          alt="Friend Convert Logo"
          className="logo-icon"
          style={{ height: '30px' }}
        />
      </div>
      {React.createElement(FiMenu as any, {
        size: 25,
        className: 'menu-icon',
        color: '#00b965',
        onClick: () => {
          setIsMenuOpen(!isMenuOpen);
        },
      })}
      <div
        className={`header-actions ${isMenuOpen ? 'slide-in' : 'slide-out'}`}
      >
        <div className="action-cancel">
          {React.createElement(FaTimes as any, {
            size: 22,
            className: 'cancel-icon',
            color: '#00b965',
            onClick: () => {
              setIsMenuOpen(false);
            },
          })}
        </div>
        <div className="action-options">
          {actions.map((action, index) => (
            <ActionButton key={index} icon={action.icon} label={action.label} />
          ))}
        </div>
      </div>
    </header>
  );
};

export default Header;
