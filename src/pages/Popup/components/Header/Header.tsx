import React from 'react';
import { FiMenu } from 'react-icons/fi';
import { FaTimes } from 'react-icons/fa';
import { GoHomeFill } from 'react-icons/go';
import { RiDeleteBin5Fill } from 'react-icons/ri';
import { FiLogOut } from 'react-icons/fi';
import ActionButton from '../ActionButton/ActionButton';
//@ts-ignore
import friendConvert from '../../../../assets/img/friendConvert.png';
import { IoGrid } from 'react-icons/io5';
import './Header.css';
import { useState } from 'react';
import { BsGrid, BsListUl } from 'react-icons/bs';
import { FaUserFriends, FaUserPlus } from 'react-icons/fa';
import { LicenseService } from '../../../../services/licenseService';

interface HeaderProps {
  page: string;
  setPage: (page: string) => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
}

interface ActionItem {
  icon: React.ReactElement;
  label: string;
  page?: string;
  action?: string;
}

const actions: ActionItem[] = [
  {
    icon: React.createElement(GoHomeFill as any, {
      size: 20,
      color: '#606060',
    }),
    label: 'Home',
    page: 'home',
  },
  {
    icon: React.createElement(IoGrid as any, { size: 20, color: '#606060' }),
    label: 'Friends impressions dashboard',
    page: 'friendsImpression',
  },
  {
    icon: React.createElement(FaUserPlus as any, {
      size: 20,
      color: '#606060',
    }),
    label: 'Add targeted friends',
    page: 'targetFriends',
  },
  {
    icon: React.createElement(RiDeleteBin5Fill as any, {
      size: 20,
      color: '#606060',
    }),
    label: 'Delete unaccepted friend requests',
    page: 'cancelPending',
  },
  {
    icon: React.createElement(FiLogOut as any, {
      size: 20,
      color: '#606060',
    }),
    label: 'Logout',
    page: 'login',
    action: 'logout',
  },
];

const Header: React.FC<HeaderProps> = ({
  page,
  setPage,
  isLoggedIn,
  setIsLoggedIn,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  return (
    <header className="header">
      <div className="logo">
        <img
          src={friendConvert}
          alt="Friend Convert Logo"
          className="logo-icon"
          style={{ height: '30px', cursor: 'pointer' }}
          onClick={() => setPage('home')}
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
            <ActionButton
              key={index}
              icon={action.icon}
              label={action.label}
              onClick={
                action.page
                  ? () => {
                      if (action.action === 'logout') {
                        // Use LicenseService for secure logout
                        LicenseService.removeLicenseKey()
                          .then(() => {
                            setIsLoggedIn(false);
                            setIsMenuOpen(false);
                            setPage(action.page!);
                            console.log('User logged out successfully');
                          })
                          .catch((error) => {
                            // console.error('Logout error:', error);
                            // Still proceed with logout even if storage clear fails
                            setIsLoggedIn(false);
                            setIsMenuOpen(false);
                            setPage(action.page!);
                          });
                      } else {
                        setPage(action.page!);
                        setIsMenuOpen(false);
                      }
                    }
                  : undefined
              }
            />
          ))}
        </div>
      </div>
    </header>
  );
};

export default Header;
