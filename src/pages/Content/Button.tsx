import React, { useEffect, useState } from 'react';
// import './Button.css';
import { ChatGroq } from '@langchain/groq';
import { FiCopy } from 'react-icons/fi';

declare global {
  interface Document {
    arrive: any;
  }
}

const Button = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [showCopyIcon, setShowCopyIcon] = useState(false);

  // useEffect(() => {
    // document.arrive('[data-test="Description"]', function() {
    //   setShowButton(true);
    // });
  // }, []);

  const togglePopup = () => {
    setShowPopup(!showPopup);
  }
  
  async function generateProposal(description: string) {
    const model = new ChatGroq({
      apiKey: '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', // Default value.
      model: 'mixtral-8x7b-32768',
    });
  
    const res = await model.stream([
      [
        'system',
        'You will Generate Job Propsal Of A Given Text. You can only Generate a job Propsal.Nothing  to Add any line that is not related to Job Propsal.',
      ],
      ['human', description]
    ]
    );

    var response = '';
  
    for await (const data of res) {
      console.log(data?.content ?? '');
      response += data?.content ?? '';
      const paragraph = document.querySelector('.paragraph');
            if (paragraph) {
              paragraph.textContent = response;
              setShowCopyIcon(true)
            }
    }
  }

  const startGenerating = () => {
    const element = document.querySelector('[data-test="Description"]');
    if (element) {
      const descriptionText = element.textContent;
      if (descriptionText) {
        generateProposal(descriptionText);
      }
    }
  }

const Copied = () => {
  const paragraph = document.querySelector('.paragraph');
  if (paragraph) {
    const textContent = paragraph.textContent;
    if (textContent) {
      navigator.clipboard.writeText(textContent);
    }
  }
}

  return (
    <>
      <button className='mainBtn'  onClick={togglePopup}>Job Proposal AI</button>
      <div className={`popup ${showPopup ? 'show' : 'hide'}`}>
      <h5 className='heading'>Generate Your Job Propsal</h5>
        <button className='Start' onClick={startGenerating}>Start Generating</button>
               
        {/* {showCopyIcon && (  <svg onClick={Copied} fill="#000000" height="800px" width="800px" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" 
           viewBox="0 0 352.804 352.804" xmlSpace="preserve">
        <g>
          <path d="M318.54,57.282h-47.652V15c0-8.284-6.716-15-15-15H34.264c-8.284,0-15,6.716-15,15v265.522c0,8.284,6.716,15,15,15h47.651
            v42.281c0,8.284,6.716,15,15,15H318.54c8.284,0,15-6.716,15-15V72.282C333.54,63.998,326.824,57.282,318.54,57.282z
             M49.264,265.522V30h191.623v27.282H96.916c-8.284,0-15,6.716-15,15v193.24H49.264z M303.54,322.804H111.916V87.282H303.54V322.804
            z"/>
        </g>
        </svg>)} */}

        {showCopyIcon && (<FiCopy className='copyicon' onClick={Copied} /> )}
        <div className='box'>
          
          <p className='paragraph'></p>
        </div>
      </div>
    </>
  );
};

export default Button;