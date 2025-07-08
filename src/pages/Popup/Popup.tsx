import React from 'react';
import Home from './components/home/Home';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import './Popup.css';
import Login from './components/Login/login';
import { useState } from 'react';

function Popup() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  return (
    <>
      <div className="popup-container">
        {isLoggedIn ? (
          <>
            <Header />
            <Home />
            <Footer />
          </>
        ) : (
          <Login isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
        )}
      </div>
    </>
  );
}

export default Popup;
