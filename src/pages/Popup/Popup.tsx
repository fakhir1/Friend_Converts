import React from 'react';
import Home from './components/home/Home';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import './Popup.css';
import Login from './components/Login/login';
import { useState, useEffect } from 'react';
import TargetFriends from './components/TargetFriends/targetFriends';
import CancelPending from './components/cancelPendingRequest/cancelPending';
import FriendsImpression from './components/FriendsImpression/friendsImpression';
import { LicenseService } from '../../services/licenseService';

function Popup() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [page, setPage] = useState('login');
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Initialize authentication state
    const initializeAuth = async () => {
      try {
        // Check if stored license is still valid
        const isValid = await LicenseService.validateStoredLicense();

        if (isValid) {
          setIsLoggedIn(true);
          // Get saved page or default to home
          chrome.storage.local.get(['lastPage'], (result) => {
            const savedPage = result.lastPage || 'home';
            setPage(savedPage);
          });
        } else {
          // Clear invalid license data
          await LicenseService.removeLicenseKey();
          setIsLoggedIn(false);
          setPage('login');
        }
      } catch (error) {
        // console.error('Authentication initialization error:', error);
        setIsLoggedIn(false);
        setPage('login');
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAuth();
  }, []);

  // Save page state whenever it changes
  useEffect(() => {
    if (page !== 'login' && isLoggedIn) {
      chrome.storage.local.set({ lastPage: page });
    }
  }, [page, isLoggedIn]);

  // Show loading state during initialization
  if (isInitializing) {
    return (
      <div
        className="popup-container"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '200px',
        }}
      >
        <div>Initializing...</div>
      </div>
    );
  }
  return (
    <>
      <div className="popup-container">
        {page === 'home' ||
        page === 'targetFriends' ||
        page === 'cancelPending' ||
        page === 'friendsImpression' ? (
          <>
            <Header
              page={page}
              setPage={setPage}
              isLoggedIn={isLoggedIn}
              setIsLoggedIn={setIsLoggedIn}
            />
            {page === 'home' ? (
              <Home page={page} setPage={setPage} />
            ) : page === 'targetFriends' ? (
              <TargetFriends />
            ) : page === 'cancelPending' ? (
              <CancelPending />
            ) : page === 'friendsImpression' ? (
              <FriendsImpression />
            ) : null}
            <Footer />
          </>
        ) : page === 'login' || isLoggedIn === false ? (
          <Login
            isLoggedIn={isLoggedIn}
            setIsLoggedIn={setIsLoggedIn}
            page={page}
            setPage={setPage}
          />
        ) : null}
      </div>
    </>
  );
}

export default Popup;
