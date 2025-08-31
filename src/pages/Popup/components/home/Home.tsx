import React from 'react';
import './home.css';
import Header from '../Header/Header';
import ActionButton from '../ActionButton/ActionButton';
import Footer from '../Footer/Footer';
import { RiDeleteBin5Fill } from 'react-icons/ri';
import { IoGrid } from 'react-icons/io5';

// Importing icons from react-icons
import { BsGrid, BsListUl } from 'react-icons/bs';
import { FaUserFriends, FaTrashAlt, FaUserPlus } from 'react-icons/fa';

interface HomeProps {
  page: string;
  setPage: (page: string) => void;
}

// Array of data for the action buttons
export const actions = [
  {
    icon: React.createElement(IoGrid as any, { size: 20, color: '#00b965' }),
    label: 'Friends impressions dashboard',
    page: 'friendsImpression',
  },
  {
    icon: React.createElement(FaUserPlus as any, {
      size: 20,
      color: '#00b965',
    }),
    label: 'Add targeted friends',
    page: 'targetFriends',
  },
  {
    icon: React.createElement(FaTrashAlt as any, {
      size: 20,
      color: '#00b965',
    }),
    label: 'Delete unaccepted friend requests',
    page: 'cancelPending',
  },
];

const Home: React.FC<HomeProps> = ({ page, setPage }) => {
  return (
    <div className="app-container">
      {/* <Header /> */}
      <main className="actions-grid">
        {actions.map((action, index) => (
          <ActionButton
            key={index}
            icon={action.icon}
            label={action.label}
            onClick={action.page ? () => setPage(action.page) : undefined}
          />
        ))}
      </main>
      {/* <Footer /> */}
    </div>
  );
};

export default Home;
