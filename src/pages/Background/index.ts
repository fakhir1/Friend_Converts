
// State management for outgoing cancellation
let cancelOutgoingState = {
  isRunning: false,
  isPaused: false,
  shouldStop: false,
  cancelCount: 0,
};

// Note: Import the manager type for better type checking
interface FriendsDataManager {
  startDataCollection(): Promise<void>;
  stopDataCollection(): Promise<void>;
  getFriendsData(): Promise<any[]>;
  getDataStats(): Promise<any>;
  navigateToFriendsPage(): void;
  navigateToActivityPage(): void;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CANCEL_OUTGOING_REQUESTS') {
    // console.log('Background received request to cancel outgoing requests');

    // Set state to running immediately
    cancelOutgoingState = {
      isRunning: true,
      isPaused: false,
      shouldStop: false,
      cancelCount: 0,
    };

    chrome.tabs.create(
      { url: 'https://www.facebook.com/friends/requests' },
      (tab) => {
        const tabId = tab?.id;
        if (!tabId) {
          // console.log('Could not create tab');
          // Reset state on error
          cancelOutgoingState = {
            isRunning: false,
            isPaused: false,
            shouldStop: false,
            cancelCount: 0,
          };
          sendResponse({ success: false, error: 'Could not create tab' });
          return;
        }

        chrome.tabs.onUpdated.addListener(function listener(
          updatedTabId,
          info
        ) {
          if (updatedTabId === tabId && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);

            // Wait 3s then send message to content script
            setTimeout(() => {
              // console.log('Sending message to content script in new tab...');
              chrome.tabs.sendMessage(
                tabId,
                {
                  type: 'CANCEL_OUTGOING_REQUESTS',
                },
                (response) => {
                  if (chrome.runtime.lastError) {
                    console.log(
                      'Failed to send message to content script:',
                      chrome.runtime.lastError
                    );
                    // Reset state on error
                    cancelOutgoingState = {
                      isRunning: false,
                      isPaused: false,
                      shouldStop: false,
                      cancelCount: 0,
                    };
                    sendResponse({
                      success: false,
                      error: 'Failed to communicate with content script',
                    });
                  } else {
                    // console.log('Message sent successfully to content script');
                    sendResponse({ success: true });
                  }
                }
              );
            }, 3000);
          }
        });
      }
    );

    return true; // Keep the message channel open for async response
  }

  // Handle status check for cancel outgoing requests
  if (message.type === 'CHECK_CANCEL_OUTGOING_STATUS') {
    sendResponse(cancelOutgoingState);
    return true;
  }

  // Handle get state for cancel outgoing requests
  if (message.type === 'GET_CANCEL_OUTGOING_STATE') {
    sendResponse(cancelOutgoingState);
    return true;
  }

  // Handle pause/resume/stop cancel outgoing requests
  if (
    message.type === 'PAUSE_CANCEL_OUTGOING' ||
    message.type === 'RESUME_CANCEL_OUTGOING' ||
    message.type === 'STOP_CANCEL_OUTGOING'
  ) {
    // Update background state
    if (message.type === 'PAUSE_CANCEL_OUTGOING') cancelOutgoingState.isPaused = true;
    if (message.type === 'RESUME_CANCEL_OUTGOING') cancelOutgoingState.isPaused = false;
    if (message.type === 'STOP_CANCEL_OUTGOING') {
      cancelOutgoingState.isRunning = false;
      cancelOutgoingState.shouldStop = true;
    }

    // Find the Facebook tab where outgoing cancel is running (specifically friends/requests page)
    chrome.tabs.query({ url: '*://*.facebook.com/friends/requests*' }, (tabs) => {
      if (tabs.length > 0 && tabs[0].id) {
        // Send message to the friends/requests tab
        chrome.tabs.sendMessage(tabs[0].id, { type: message.type }, (resp) => {
          if (chrome.runtime.lastError) {
            console.error('Error forwarding message to content script:', chrome.runtime.lastError);
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
            console.log(`Successfully forwarded ${message.type} to content script`);
            sendResponse({ success: true });
          }
        });
      } else {
        // Fallback: try any Facebook tab
        chrome.tabs.query({ url: '*://*.facebook.com/*' }, (allFbTabs) => {
          const targetTab = allFbTabs.find((tab) => tab.id && tab.status === 'complete');
          if (targetTab && targetTab.id) {
            chrome.tabs.sendMessage(targetTab.id, { type: message.type }, (resp) => {
              if (chrome.runtime.lastError) {
                console.error('Error forwarding message to fallback tab:', chrome.runtime.lastError);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
              } else {
                console.log(`Successfully forwarded ${message.type} to fallback tab`);
                sendResponse({ success: true });
              }
            });
          } else {
            console.error('No Facebook tab found to forward command');
            sendResponse({ success: false, error: 'No Facebook tab found to forward command.' });
          }
        });
      }
    });
    return true;
  }

  // Handle completion message from content script
  if (message.type === 'CANCEL_OUTGOING_COMPLETED') {
    cancelOutgoingState = {
      isRunning: false,
      isPaused: false,
      shouldStop: false,
      cancelCount: message.cancelCount || cancelOutgoingState.cancelCount,
    };
    sendResponse({ success: true });
    return true;
  }

  // Handle state update from content script
  if (message.type === 'UPDATE_CANCEL_OUTGOING_STATE') {
    cancelOutgoingState = { ...cancelOutgoingState, ...message.state };
    sendResponse({ success: true });
    return true;
  }

  // Handle friends data collection messages
  if (message.type === 'START_FRIENDS_DATA_COLLECTION') {
    // Check if we already have a Facebook tab open
    chrome.tabs.query({ url: '*://*.facebook.com/*' }, (tabs) => {
      let targetTab = tabs.find(
        (tab) =>
          tab.url?.includes('/friends') || tab.url?.includes('facebook.com')
      );

      if (targetTab && targetTab.id) {
        // Use existing Facebook tab
        console.log('Using existing Facebook tab:', targetTab.id);
        chrome.tabs.update(targetTab.id, {
          active: true,
          url: 'https://www.facebook.com/friends/list',
        });

        // Set collection active status
        chrome.storage.local.set({ friendsDataCollectionActive: true });

        // Wait for page load then start collection
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === targetTab!.id && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            setTimeout(() => {
              chrome.tabs.sendMessage(targetTab!.id!, {
                type: 'START_FRIENDS_DATA_COLLECTION',
              });
            }, 2000);
          }
        });
      } else {
        // Create new tab only if no Facebook tab exists
        chrome.tabs.create(
          {
            url: 'https://www.facebook.com/friends/list',
            active: true,
          },
          (tab) => {
            if (tab?.id) {
              // Set collection active status
              chrome.storage.local.set({ friendsDataCollectionActive: true });

              // Wait for page load then start collection
              chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
                if (tabId === tab.id && info.status === 'complete') {
                  chrome.tabs.onUpdated.removeListener(listener);
                  setTimeout(() => {
                    chrome.tabs.sendMessage(tab.id!, {
                      type: 'START_FRIENDS_DATA_COLLECTION',
                    });
                  }, 2000);
                }
              });
            }
          }
        );
      }
    });

    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'STOP_FRIENDS_DATA_COLLECTION') {
    // Set collection inactive status
    chrome.storage.local.set({ friendsDataCollectionActive: false });

    // Send stop message to all Facebook tabs
    chrome.tabs.query({ url: '*://*.facebook.com/*' }, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'STOP_FRIENDS_DATA_COLLECTION',
          });
        }
      });
    });
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'GET_FRIENDS_DATA') {
    chrome.storage.local.get(['friendsInteractionData'], (result) => {
      sendResponse({
        success: true,
        data: result.friendsInteractionData || [],
      });
    });
    return true;
  }

  if (message.type === 'GET_FRIENDS_DATA_STATS') {
    chrome.storage.local.get(
      ['friendsInteractionData', 'friendsDataCollectionActive'],
      (result) => {
        const data = result.friendsInteractionData || [];
        const totalInteractions = data.reduce(
          (sum: number, friend: any) =>
            sum + friend.totalLikes + friend.totalComments + friend.totalShares,
          0
        );

        const stats = {
          totalFriends: data.length,
          totalInteractions,
          lastUpdateTime:
            data.length > 0
              ? Math.max(...data.map((f: any) => f.lastUpdated))
              : 0,
          dataCollectionActive: result.friendsDataCollectionActive || false,
        };

        sendResponse({ success: true, stats });
      }
    );
    return true;
  }

  if (message.type === 'NAVIGATE_TO_FRIENDS_PAGE') {
    chrome.tabs.create({
      url: 'https://www.facebook.com/friends/list',
      active: true,
    });
    sendResponse({ success: true });
  }

  if (message.type === 'NAVIGATE_TO_ACTIVITY_PAGE') {
    chrome.tabs.create({
      url: 'https://www.facebook.com/me/allactivity',
      active: true,
    });
    sendResponse({ success: true });
  }

  if (message.type === 'CLEAR_FRIENDS_DATA') {
    chrome.storage.local.remove(['friendsInteractionData'], () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'EXPORT_FRIENDS_DATA') {
    chrome.storage.local.get(['friendsInteractionData'], (result) => {
      const data = result.friendsInteractionData || [];
      sendResponse({ success: true, data: JSON.stringify(data, null, 2) });
    });
    return true;
  }

  // Handle data updated messages from content script
  if (message.type === 'FRIENDS_DATA_UPDATED') {
    // Broadcast to all extension contexts
    chrome.runtime.sendMessage({
      type: 'FRIENDS_DATA_UPDATED',
      data: message.data,
    });
  }

  // Handle friend requests completion message from content script
  if (message.type === 'FRIEND_REQUESTS_COMPLETED') {
    chrome.runtime.sendMessage({
      type: 'FRIEND_REQUESTS_COMPLETED',
      sentCount: message.sentCount,
      completed: message.completed,
    });
  }

  // Handle tab removal request from content script
  if (message.type === 'REMOVE_CURRENT_TAB') {
    const tabId = sender.tab?.id;
    if (tabId) {
      chrome.tabs.remove(tabId, () => {
        if (chrome.runtime.lastError) {
          console.log('Failed to remove tab:', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError });
        } else {
          // console.log('Tab removed successfully');
          sendResponse({ success: true });
        }
      });
    } else {
      // console.log('No tab ID available for removal');
      sendResponse({ success: false, error: 'No tab ID available' });
    }
    return true; // Keep the message channel open for async response
  }
});
