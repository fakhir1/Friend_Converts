import React from 'react';
import { render } from 'react-dom';
import Button from './Button';
import './arrive.js';

console.log('button loaded');

document.arrive('.sidebar', (elem) => {
  const button = document.createElement('div');
  button.id = 'button-container';
  button.style.position = 'fixed';
  button.style.top = '40%';
  button.style.left = '81%';
  button.style.zIndex = '9999';
  button.style.color = 'white';
  button.style.backgroundColor = 'green';

  elem.appendChild(button);

  render(<Button />, document.querySelector('#button-container'));
});

export function Content() {}
