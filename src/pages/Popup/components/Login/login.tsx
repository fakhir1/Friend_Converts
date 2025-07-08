import React from 'react';
//@ts-ignore
import friendConvert from '../../../../assets/img/friendConvert.png';
import './login.css';

interface LoginProps {
  isLoggedIn: boolean;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
}

function login({ isLoggedIn, setIsLoggedIn }: LoginProps) {
  const [inputText, setInputText] = React.useState('');

  return (
    <div className="login-container">
      <img
        src={friendConvert}
        alt="Friend Convert Logo"
        className="login-logo"
      />
      <h1 className="login-title">Welcome to Friend Convert</h1>
      <p className="login-description">
        Want to build targetted audience on Facebook, save time and get more
        sales?
      </p>
      <form className="login-form">
        <input
          type="text"
          placeholder="License Key"
          className="lisense-input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          required
        />
        <button
          type="submit"
          className="login-button"
          onClick={() => {
            // Handle login logic here
            console.log('Login button clicked');
            if (inputText.trim() === 'WEMA1EK1AMB2SNRB') {
              // Simulate successful login
              setIsLoggedIn(true);
            } else {
              console.log('Invalid license key');
            }
          }}
        >
          Login
        </button>
      </form>
    </div>
  );
}

export default login;
