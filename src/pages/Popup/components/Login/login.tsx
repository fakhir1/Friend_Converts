import React from 'react';
//@ts-ignore
import friendConvert from '../../../../assets/img/friendConvert.png';
import './login.css';
import { LicenseService } from '../../../../services/licenseService';

interface LoginProps {
  isLoggedIn: boolean;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
  page: string;
  setPage: (page: string) => void;
}

function login({ isLoggedIn, setIsLoggedIn, page, setPage }: LoginProps) {
  const [inputText, setInputText] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputText.trim()) {
      setErrorMessage('Please enter a license key');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      // Validate license key
      const result = await LicenseService.validateLicense(inputText.trim());

      if (result.valid) {
        // Store the license key
        await LicenseService.storeLicenseKey(inputText.trim());

        // Update UI state
        setIsLoggedIn(false);
        setPage('home');

        // Save the initial page state after successful login
        chrome.storage.local.set({ lastPage: 'home' });

        // console.log('License validated successfully');
      } else {
        setErrorMessage(
          result.error || 'Invalid license key. Please check and try again.'
        );
        // console.log('License validation failed:', result.error);
      }
    } catch (error) {
      setErrorMessage(
        'Network error. Please check your connection and try again.'
      );
      // console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

      {errorMessage && (
        <div
          className="error-message"
          style={{
            color: '#ff4444',
            marginBottom: '16px',
            padding: '8px',
            backgroundColor: '#fff5f5',
            border: '1px solid #ffcccc',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        >
          {errorMessage}
        </div>
      )}

      <form className="login-form" onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="License Key"
          className="lisense-input"
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            setErrorMessage(''); // Clear error when user types
          }}
          disabled={isLoading}
          required
        />
        <button
          type="submit"
          className="login-button"
          disabled={isLoading}
          style={{
            opacity: isLoading ? 0.7 : 1,
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? 'Validating...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

export default login;
