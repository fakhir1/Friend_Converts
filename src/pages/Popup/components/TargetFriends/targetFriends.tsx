import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import './targetFriends.css';

// Extend the Window interface to include sendFriendRequests
declare global {
  interface Window {
    sendFriendRequests?: (
      keywords: string[],
      maxRequests: number,
      delayTime: number,
      useKeywordFilter?: boolean
    ) => Promise<void>;
  }
}

function TargetFriends() {
  const [limit, setLimit] = useState<string>('');
  const [delay, setDelay] = useState<string>('3');
  const [input, setInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [automationState, setAutomationState] = useState<
    'idle' | 'running' | 'paused'
  >('idle');
  const [validationErrors, setValidationErrors] = useState({
    keywords: false,
    limit: false,
    delay: false,
  });

  // Restore state on mount
  useEffect(() => {
    chrome.storage.local.get(
      [
        'targetFriendsLimit',
        'targetFriendsDelay',
        'targetFriendsKeywords',
        'automationState',
      ],
      (result) => {
        if (typeof result.targetFriendsLimit === 'string')
          setLimit(result.targetFriendsLimit);
        if (typeof result.targetFriendsDelay === 'string')
          setDelay(result.targetFriendsDelay);
        if (Array.isArray(result.targetFriendsKeywords))
          setKeywords(result.targetFriendsKeywords);
        if (
          typeof result.automationState === 'string' &&
          ['idle', 'running', 'paused'].includes(result.automationState)
        )
          setAutomationState(
            result.automationState as 'idle' | 'running' | 'paused'
          );
      }
    );
  }, []);

  // Listen for completion messages from content script
  useEffect(() => {
    const messageListener = (message: any) => {
      if (message.type === 'FRIEND_REQUESTS_COMPLETED') {
        setAutomationState('idle');
        setLoading(false);
        // Persist the completion state
        chrome.storage.local.set({ automationState: 'idle' });
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  // Check for completion status when popup opens
  useEffect(() => {
    const checkCompletionStatus = async () => {
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });

        if (tab?.id) {
          // Send a message to check if automation is still running with timeout
          const timeout = setTimeout(() => {
            // If no response within 2 seconds, assume automation is idle
            setAutomationState('idle');
            setLoading(false);
            chrome.storage.local.set({ automationState: 'idle' });
          }, 2000);

          chrome.tabs.sendMessage(
            tab.id,
            { type: 'CHECK_AUTOMATION_STATUS' },
            (response) => {
              clearTimeout(timeout);
              // If no response or automation is not running, reset to idle
              if (
                chrome.runtime.lastError ||
                !response ||
                !response.isRunning
              ) {
                setAutomationState('idle');
                setLoading(false);
                chrome.storage.local.set({ automationState: 'idle' });
              }
            }
          );
        }
      } catch (error) {
        // If we can't communicate with content script, assume it's idle
        setAutomationState('idle');
        setLoading(false);
        chrome.storage.local.set({ automationState: 'idle' });
      }
    };

    // Only check if we think automation is running
    if (automationState === 'running') {
      checkCompletionStatus();
    }
  }, [automationState]);

  // Persist limit
  useEffect(() => {
    chrome.storage.local.set({ targetFriendsLimit: limit });
  }, [limit]);

  // Persist delay
  useEffect(() => {
    chrome.storage.local.set({ targetFriendsDelay: delay });
  }, [delay]);

  // Persist keywords
  useEffect(() => {
    chrome.storage.local.set({ targetFriendsKeywords: keywords });
  }, [keywords]);

  // Persist automation state
  useEffect(() => {
    chrome.storage.local.set({ automationState: automationState });
  }, [automationState]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      addKeyword(input.trim());
    }
  };

  const addKeyword = (keyword: string) => {
    const clean = keyword.toLowerCase();
    if (clean && !keywords.includes(clean)) {
      setKeywords([...keywords, clean]);
      clearValidationError('keywords');
    }
    setInput('');
  };

  const removeKeyword = (removeIdx: number) => {
    setKeywords(keywords.filter((_, idx) => idx !== removeIdx));
  };

  const clearValidationError = (field: keyof typeof validationErrors) => {
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: false }));
    }
  };

  const handleStart = async () => {
    chrome.storage.local.set({
      isPaused: false,
    });
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (
      tab?.url &&
      !(tab.url.includes('/members') || tab.url.includes('/people'))
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Tab',
        text: 'Please redirect to group members tab.',
      });

      return;
    }

    // Validate inputs and set error states
    const errors = {
      keywords: false, // Allow empty keywords - will send requests to all users
      limit: limit === '',
      delay: delay === '',
    };

    setValidationErrors(errors);

    if (errors.keywords || errors.limit || errors.delay) {
      return;
    }

    setLoading(true);
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (typeof tab?.id !== 'number') {
        throw new Error('Could not find active tab.');
      }
      await chrome.tabs.reload(tab.id);
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === 'complete') {
          chrome.tabs.sendMessage(tab.id!, {
            type: 'START_FRIEND_REQUESTS',
            keywords,
            maxRequests: limit === '' ? 0 : Number(limit),
            delayTime: delay === '' ? 0 : Number(delay),
            useKeywordFilter: keywords.length > 0, // Flag to indicate keyword mode
          });
          chrome.tabs.onUpdated.removeListener(listener);
          setLoading(false);
          setAutomationState('running');
        }
      });
    } catch (e) {
      alert('An error occurred: ' + e);
      setLoading(false);
    }
  };

  const handlePause = async () => {
    setAutomationState('paused');
    chrome.storage.local.set({ isPaused: true });
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (typeof tab?.id === 'number') {
      chrome.tabs.sendMessage(tab.id, { type: 'PAUSE_FRIEND_REQUESTS' });
    }
  };

  const handleResume = async () => {
    setAutomationState('running');
    chrome.storage.local.set({ isPaused: false });
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (typeof tab?.id === 'number') {
      chrome.tabs.sendMessage(tab.id, { type: 'RESUME_FRIEND_REQUESTS' });
    }
  };

  const handleStop = async () => {
    setAutomationState('idle');
    setLimit('');
    setDelay('');
    // setKeywords([]); // Removed to keep keywords after stop
    chrome.storage.local.remove([
      'targetFriendsLimit',
      'targetFriendsDelay',
      'automationState',
    ]); // Removed targetFriendsKeywords
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (typeof tab?.id === 'number') {
      chrome.tabs.sendMessage(tab.id, { type: 'STOP_FRIEND_REQUESTS' });
    }
  };

  return (
    <div className="target-friends-container">
      <h2 className="target-friends-title">Add targeted friends</h2>
      <div className="target-friends-input-row">
        <div className="target-friends-input-group">
          <label className="target-friends-label">
            Limit{' '}
            <span
              className="info-icon"
              title="Set the maximum number of friends to add"
            >
              &#9432;
            </span>
          </label>
          <input
            className="target-friends-input"
            type="number"
            min={1}
            placeholder="e.g. 20"
            value={limit}
            onChange={(e) => {
              setLimit(e.target.value);
              clearValidationError('limit');
            }}
            disabled={loading || automationState !== 'idle'}
            style={{
              borderColor: validationErrors.limit ? '#ff4d4f' : undefined,
              borderWidth: validationErrors.limit ? '1px' : undefined,
            }}
          />
        </div>
        <div className="target-friends-input-group">
          <label className="target-friends-label">
            Delay{' '}
            <span
              className="info-icon"
              title="Set the delay between actions (in seconds)"
            >
              &#9432;
            </span>
          </label>
          <select
            className="target-friends-input"
            value={delay}
            onChange={(e) => {
              setDelay(e.target.value);
              clearValidationError('delay');
            }}
            disabled={loading || automationState !== 'idle'}
            style={{
              borderColor: validationErrors.delay ? '#ff4d4f' : undefined,
              borderWidth: validationErrors.delay ? '1px' : undefined,
              color: '#555', // dark grey text
            }}
          >
            <option value="" disabled style={{ color: '#aaa' }}>
              Select delay...
            </option>
            <option value="3">3 seconds</option>
            <option value="5">5 seconds</option>
            <option value="7">7 seconds</option>
            <option value="10">10 seconds</option>
            <option value="15">15 seconds</option>
            <option value="20">20 seconds</option>
            <option value="25">25 seconds</option>
            <option value="30">30 seconds</option>
          </select>
        </div>
      </div>
      <div className="target-friends-keywords-group">
        <label className="target-friends-label">
          Keywords{' '}
          <span className="info-icon" title="Type a keyword">
            &#9432;
          </span>
        </label>
        <div
          className="tag-input-wrapper"
          style={{
            borderColor: validationErrors.keywords ? '#ff4d4f' : undefined,
            borderWidth: validationErrors.keywords ? '1px' : undefined,
          }}
        >
          {keywords.map((tag, idx) => (
            <span className="tag" key={tag}>
              {tag}
              <button className="tag-remove" onClick={() => removeKeyword(idx)}>
                &times;
              </button>
            </span>
          ))}
          <input
            className="target-friends-keywords-input"
            type="text"
            placeholder="Type a keyword and press enter"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            disabled={loading || automationState !== 'idle'}
          />
        </div>
      </div>
      {automationState === 'idle' && (
        <button
          className="target-friends-start-btn"
          onClick={handleStart}
          disabled={loading}
        >
          {loading ? 'Running...' : 'Start'}
        </button>
      )}
      {automationState !== 'idle' && (
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button
            className="target-friends-start-btn"
            style={{ background: '#ff9800' }}
            onClick={automationState === 'running' ? handlePause : handleResume}
          >
            {automationState === 'running' ? 'Pause' : 'Resume'}
          </button>
          <button
            className="target-friends-start-btn"
            style={{ background: '#ff4d4f' }}
            onClick={handleStop}
          >
            Stop
          </button>
        </div>
      )}
    </div>
  );
}

export default TargetFriends;
