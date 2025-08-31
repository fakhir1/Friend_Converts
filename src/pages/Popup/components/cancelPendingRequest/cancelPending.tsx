import React, { useState, useEffect } from 'react';
import './cancelPending.css';
import Swal from 'sweetalert2';
import { delay } from '../../../Content/cancelPendingRequests';

function CancelPending() {
  const [cancelOutgoingState, setCancelOutgoingState] = useState({
    isRunning: false,
    isPaused: false,
    shouldStop: false,
    cancelCount: 0,
  });

  // Load saved state when component mounts
  useEffect(() => {
    const loadSavedState = async () => {
      try {
        const result = await chrome.storage.local.get(['cancelOutgoingState']);
        if (result.cancelOutgoingState) {
          setCancelOutgoingState(result.cancelOutgoingState);
        }

        // After loading saved state, check with background script for current status
        if (result.cancelOutgoingState?.isRunning) {
          try {
            const response = await chrome.runtime.sendMessage({
              type: 'CHECK_CANCEL_OUTGOING_STATUS',
            });
            if (response && typeof response.isRunning === 'boolean') {
              setCancelOutgoingState(response);
              chrome.storage.local.set({ cancelOutgoingState: response });
            }
          } catch (error) {
            // console.error('Error checking initial outgoing status:', error);
          }
        }
      } catch (error) {
        // console.error('Error loading saved state:', error);
      }
    };
    loadSavedState();
  }, []);

  // Listen for completion messages from content script
  useEffect(() => {
    const messageListener = (message: any) => {
      if (message.type === 'CANCEL_OUTGOING_COMPLETED') {
        setCancelOutgoingState({
          isRunning: false,
          isPaused: false,
          shouldStop: false,
          cancelCount: message.cancelCount || 0,
        });
        chrome.storage.local.set({
          cancelOutgoingState: {
            isRunning: false,
            isPaused: false,
            shouldStop: false,
            cancelCount: message.cancelCount || 0,
          },
        });
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  // Save outgoing state whenever it changes
  useEffect(() => {
    const saveOutgoingState = async () => {
      try {
        await chrome.storage.local.set({ cancelOutgoingState });
      } catch (error) {
        // console.error('Error saving outgoing state:', error);
      }
    };
    saveOutgoingState();
  }, [cancelOutgoingState]);

  const handleCancelOutgoing = async () => {
    try {
      console.log('Sending message to background script...');

      // Set the state to running immediately when button is clicked
      const newState = { ...cancelOutgoingState, isRunning: true };
      setCancelOutgoingState(newState);
      chrome.storage.local.set({ cancelOutgoingState: newState });

      // Start polling for state updates
      pollCancelOutgoingState();
      const response = await chrome.runtime.sendMessage({
        type: 'CANCEL_OUTGOING_REQUESTS',
      });

      if (response?.success) {
        // console.log('Outgoing requests cancellation started successfully');
      } else {
        // console.error('Failed to start cancellation:', response?.error);
        // Reset state if failed to start
        const resetState = {
          isRunning: false,
          isPaused: false,
          shouldStop: false,
          cancelCount: 0,
        };
        setCancelOutgoingState(resetState);
        chrome.storage.local.set({ cancelOutgoingState: resetState });
        // alert('Failed to start cancellation process. Please try again.');
      }
    } catch (error) {
      // console.error('Error sending message:', error);
      // Reset state if error occurred
      const resetState = {
        isRunning: false,
        isPaused: false,
        shouldStop: false,
        cancelCount: 0,
      };
      setCancelOutgoingState(resetState);
      chrome.storage.local.set({ cancelOutgoingState: resetState });
      // alert('Failed to communicate with extension. Please try again.');
    }
  };

  const pollCancelOutgoingState = () => {
    const interval = setInterval(async () => {
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'GET_CANCEL_OUTGOING_STATE',
        });
        if (response) {
          setCancelOutgoingState(response);
          chrome.storage.local.set({ cancelOutgoingState: response });
          // Stop polling if process is finished
          if (!response.isRunning) {
            clearInterval(interval);
            const finalState = {
              isRunning: false,
              isPaused: false,
              shouldStop: false,
              cancelCount: response.cancelCount,
            };
            setCancelOutgoingState(finalState);
            chrome.storage.local.set({ cancelOutgoingState: finalState });
          }
        }
      } catch (e) {
        clearInterval(interval);
      }
    }, 500);
  };

  const handlePauseOutgoing = async () => {
    try {
      await chrome.runtime.sendMessage({
        type: 'PAUSE_CANCEL_OUTGOING',
      });
      const newState = { ...cancelOutgoingState, isPaused: true };
      setCancelOutgoingState(newState);
      chrome.storage.local.set({ cancelOutgoingState: newState });
    } catch (e) {
      // console.error('Error pausing outgoing:', e);
    }
  };

  const handleResumeOutgoing = async () => {
    try {
      await chrome.runtime.sendMessage({
        type: 'RESUME_CANCEL_OUTGOING',
      });
      const newState = { ...cancelOutgoingState, isPaused: false };
      setCancelOutgoingState(newState);
      chrome.storage.local.set({ cancelOutgoingState: newState });
    } catch (e) {
      // console.error('Error resuming outgoing:', e);
    }
  };

  const handleStopOutgoing = async () => {
    try {
      await chrome.runtime.sendMessage({
        type: 'STOP_CANCEL_OUTGOING',
      });
      // Reset state immediately when stop is clicked
      const newState = {
        isRunning: false,
        isPaused: false,
        shouldStop: true,
        cancelCount: cancelOutgoingState.cancelCount,
      };
      setCancelOutgoingState(newState);
      chrome.storage.local.set({ cancelOutgoingState: newState });
    } catch (e) {
      // console.error('Error stopping outgoing:', e);
    }
  };

  return (
    <div className="cancel-pending-container">
      <h3 style={{ color: '#ff9800', marginBottom: 10 }}>
        Cancel Outgoing Friend Requests
      </h3>

      {!cancelOutgoingState.isRunning && (
        <button
          className="cancel-pending-start-btn"
          style={{ background: '#ff9800', marginBottom: 10 }}
          onClick={handleCancelOutgoing}
        >
          Cancel Outgoing Requests
        </button>
      )}

      {cancelOutgoingState.isRunning && (
        <div style={{ marginTop: '16px' }}>
          <div
            style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'center',
              marginBottom: '12px',
            }}
          >
            <button
              className="target-friends-start-btn"
              onClick={
                cancelOutgoingState.isPaused
                  ? handleResumeOutgoing
                  : handlePauseOutgoing
              }
              style={{
                background: cancelOutgoingState.isPaused
                  ? '#4caf50'
                  : '#ff9800',
                width: '90px',
              }}
            >
              {cancelOutgoingState.isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              className="target-friends-start-btn"
              onClick={handleStopOutgoing}
              style={{
                background: '#ff4d4f',
                width: '80px',
              }}
            >
              Stop
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CancelPending;
