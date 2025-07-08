import React from 'react';
import './Footer.css';

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <hr className="footer-divider" />
      <div className="footer-links">
        <a href="#">Get support</a>
        <span>|</span>
        <a href="#">Become affiliate</a>
      </div>
      <p className="footer-disclaimer">
        Friend Convert is not affiliated with Facebook in anyway
      </p>
    </footer>
  );
};

export default Footer;
