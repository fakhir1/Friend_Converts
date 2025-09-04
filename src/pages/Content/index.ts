import './progressPopup';
import './fbFriendsApi';
import './fbPostsApi';
import './fbDeleteApi';
import { mergeFriendsWithEngagement, getEngagementSummary } from './helper';

// console.log('Content Working on:', window.location.hostname);

import { sendFriendRequests } from './friendRequestAutomation';
import {
  cancelOutgoingRequests,
  pauseCancelOutgoing,
  resumeCancelOutgoing,
  stopCancelOutgoing,
  getCancelOutgoingState,
} from './cancelPendingRequests';
// import { facebookApiInterceptor } from './modules/facebookApiInterceptor';

// Add error handling for the Facebook API interceptor
try {
  // console.log('Facebook API Interceptor loaded successfully');
} catch (error) {
  // console.error('Failed to load Facebook API Interceptor:', error);
}

// Add global error handling
window.addEventListener('error', (event) => {
  // console.error('Content script error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  // console.error('Content script unhandled promise rejection:', event.reason);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // console.log('Content script received message:', message);

  if (message.type === 'START_FRIEND_REQUESTS') {
    sendFriendRequests(
      message.keywords,
      message.maxRequests,
      message.delayTime,
      message.useKeywordFilter
    );
  }
  if (message.type === 'START_FRIENDS_DATA_COLLECTION') {
    // console.log('Starting Facebook Friends Data Collection...');
    // Check if we're on Facebook
    if (!window.location.hostname.includes('facebook.com')) {
      // console.error(
      //   'Not on Facebook domain. Please navigate to Facebook first.'
      // );
      sendResponse({
        success: false,
        error: 'Not on Facebook domain. Please navigate to Facebook first.',
      });
      return true;
    }

    // Run the Facebook Friends API
    if (typeof (window as any).runFacebookFriendsAPI === 'function') {
      (window as any)
        .runFacebookFriendsAPI(true)
        .then(() => {
          const friendsData = (window as any).facebookFriendsData || [];
          // console.log('Facebook Friends API completed successfully!');
          // console.log(`Total friends collected: ${friendsData.length}`);

          sendResponse({
            success: true,
            data: friendsData,
            message: `Successfully collected ${friendsData.length} friends data`,
          });
          // Notify popup that collection is complete with data
          chrome.runtime.sendMessage({
            type: 'FRIENDS_COLLECTION_COMPLETED',
            data: friendsData,
          });
        })
        .catch((error: any) => {
          // console.error('Facebook Friends API failed:', error);
          sendResponse({
            success: false,
            error: error.message || 'Unknown error occurred',
          });
          // Notify popup that collection failed
          chrome.runtime.sendMessage({
            type: 'FRIENDS_COLLECTION_COMPLETED',
            error: error.message || 'Unknown error occurred',
          });
        });
    } else {
      // console.error('Facebook Friends API not loaded');
      sendResponse({
        success: false,
        error: 'Facebook Friends API not loaded. Please refresh the page.',
      });
      // Notify popup that collection failed
      chrome.runtime.sendMessage({
        type: 'FRIENDS_COLLECTION_COMPLETED',
        error: 'Facebook Friends API not loaded. Please refresh the page.',
      });
    }
    return true; // Keep message channel open for async response
  }

  if (message.type === 'START_POSTS_ENGAGEMENT_COLLECTION') {
    // console.log('Starting Facebook Posts Engagement Collection...');

    // Check if we're on Facebook
    if (!window.location.hostname.includes('facebook.com')) {
      // console.error(
      //   'Not on Facebook domain. Please navigate to Facebook first.'
      // );
      sendResponse({
        success: false,
        error: 'Not on Facebook domain. Please navigate to Facebook first.',
      });
      return true;
    }

    // Run the Facebook Posts API with engagement
    if (typeof (window as any).getAllPostsWithEngagement === 'function') {
      // console.log(
      //   'Starting comprehensive posts and engagement collection...'
      // );

      (window as any)
        .getAllPostsWithEngagement(
          message.profileId || null,
          true,
          message.postLimit || 100
        )
        .then((postsData: any[]) => {
          // console.log('Facebook Posts API completed successfully!');
          // console.log(`Total posts collected: ${postsData.length}`);

          // Calculate engagement summary
          const totalReactions = postsData.reduce(
            (sum, post) => sum + (post.engagement?.reactions?.total || 0),
            0
          );
          const totalComments = postsData.reduce(
            (sum, post) => sum + (post.engagement?.comments?.total || 0),
            0
          );
          const totalShares = postsData.reduce(
            (sum, post) => sum + (post.engagement?.shares?.total || 0),
            0
          );

          // Try to merge with existing friends data if available
          let mergedFriendsData = null;
          let engagementSummary = null;

          try {
            const existingFriendsData = (window as any).facebookFriendsData;
            if (
              existingFriendsData &&
              Array.isArray(existingFriendsData) &&
              existingFriendsData.length > 0
            ) {
              // console.log(
              //   'Merging posts engagement with existing friends data...'
              // );
              mergedFriendsData = mergeFriendsWithEngagement(
                existingFriendsData,
                postsData
              );
              engagementSummary = getEngagementSummary(mergedFriendsData);

              // Store merged data globally
              (window as any).facebookFriendsWithEngagement = mergedFriendsData;
              (window as any).engagementSummary = engagementSummary;

              // console.log(
              //   'Successfully merged friends with engagement data!'
              // );
              // console.log(`Engagement Summary:`, engagementSummary);
            } else {
              // console.log(
              //   'No friends data available for merging. Collect friends data first for enhanced analysis.'
              // );
            }
          } catch (mergeError) {
            // console.error('Error during merge process:', mergeError);
            // Continue without failing the entire operation
          }

          sendResponse({
            success: true,
            data: postsData,
            mergedFriendsData: mergedFriendsData,
            engagementSummary: engagementSummary,
            summary: {
              totalPosts: postsData.length,
              totalReactions,
              totalComments,
              totalShares,
            },
            message: mergedFriendsData
              ? `Successfully collected ${postsData.length} posts with engagement data and merged with ${mergedFriendsData.length} friends`
              : `Successfully collected ${postsData.length} posts with full engagement data`,
          });
          // Notify popup that engagement collection is complete
          chrome.runtime.sendMessage({
            type: 'ENGAGEMENT_COLLECTION_COMPLETED',
          });
        })
        .catch((error: any) => {
          // console.error('Facebook Posts API failed:', error);
          sendResponse({
            success: false,
            error:
              error.message || 'Unknown error occurred during posts collection',
          });
        });
    } else {
      // console.error('Facebook Posts API not loaded');
      sendResponse({
        success: false,
        error: 'Facebook Posts API not loaded. Please refresh the page.',
      });
    }
    return true; // Keep message channel open for async response
  }

  if (message.type === 'CHECK_FACEBOOK_API_STATUS') {
    const isFriendsApiLoaded =
      typeof (window as any).runFacebookFriendsAPI === 'function';
    const isPostsApiLoaded =
      typeof (window as any).getAllPostsWithEngagement === 'function';
    const isOnFacebook = window.location.hostname.includes('facebook.com');

    sendResponse({
      success: true,
      friendsApiLoaded: isFriendsApiLoaded,
      postsApiLoaded: isPostsApiLoaded,
      onFacebook: isOnFacebook,
      currentUrl: window.location.href,
    });
    return true;
  }
  if (message.type === 'START_UNFRIEND_USERS') {
    // console.log('Starting unfriend operation for selected users...');

    // Check if we're on Facebook
    if (!window.location.hostname.includes('facebook.com')) {
      sendResponse({
        success: false,
        error: 'Not on Facebook domain. Please navigate to Facebook first.',
      });
      return true;
    }

    // Check if unfriend function is available
    if (typeof (window as any).unfriendMultipleUsers !== 'function') {
      sendResponse({
        success: false,
        error: 'Unfriend API not loaded. Please refresh the page.',
      });
      return true;
    }

    const { friendRequests, delayMs = 2000 } = message;

    if (
      !friendRequests ||
      !Array.isArray(friendRequests) ||
      friendRequests.length === 0
    ) {
      sendResponse({
        success: false,
        error: 'No friends selected for unfriending.',
      });
      return true;
    }

    // Start unfriend operation
    (window as any)
      .unfriendMultipleUsers(
        friendRequests,
        delayMs,
        // Progress callback
        (completed: number, total: number, current: any, result: any) => {
          // Send progress updates to popup
          chrome.runtime.sendMessage({
            type: 'UNFRIEND_PROGRESS',
            completed,
            total,
            current,
            result,
            percentage: Math.round((completed / total) * 100),
          });
        }
      )
      .then((results: any[]) => {
        const successCount = results.filter((r) => r.success).length;
        const failureCount = results.filter((r) => !r.success).length;

        // console.log(
        //   `Unfriend operation completed: ${successCount} successful, ${failureCount} failed`
        // );

        // Send completion message
        chrome.runtime.sendMessage({
          type: 'UNFRIEND_COMPLETED',
          results,
          successCount,
          failureCount,
          total: results.length,
        });

        sendResponse({
          success: true,
          results,
          successCount,
          failureCount,
          message: `Unfriend operation completed: ${successCount} successful, ${failureCount} failed`,
        });
      })
      .catch((error: any) => {
        // console.error('Unfriend operation failed:', error);

        chrome.runtime.sendMessage({
          type: 'UNFRIEND_ERROR',
          error: error.message || 'Unknown error occurred',
        });

        sendResponse({
          success: false,
          error:
            error.message || 'Unknown error occurred during unfriend operation',
        });
      });

    return true; // Keep message channel open for async response
  }

  if (message.type === 'CANCEL_OUTGOING_REQUESTS') {
    // console.log('Executing cancel outgoing requests...');
    cancelOutgoingRequests()
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        // console.error('Error in cancelOutgoingRequests:', error);
        sendResponse({ success: false, error: String(error) });
      });
    return true; // Keep message channel open for async response
  }
  if (message.type === 'PAUSE_CANCEL_OUTGOING') {
    // console.log('Pausing cancel outgoing requests...');
    if (typeof pauseCancelOutgoing === 'function') pauseCancelOutgoing();
    sendResponse({ success: true });
    return true;
  }
  if (message.type === 'RESUME_CANCEL_OUTGOING') {
    // console.log('Resuming cancel outgoing requests...');
    if (typeof resumeCancelOutgoing === 'function') resumeCancelOutgoing();
    sendResponse({ success: true });
    return true;
  }
  if (message.type === 'STOP_CANCEL_OUTGOING') {
    // console.log('Stopping cancel outgoing requests...');
    if (typeof stopCancelOutgoing === 'function') stopCancelOutgoing();
    // Send completion message when manually stopped
    chrome.runtime.sendMessage({
      type: 'CANCEL_OUTGOING_COMPLETED',
      cancelCount: (typeof getCancelOutgoingState === 'function' ? getCancelOutgoingState().cancelCount : 0),
      completed: true,
    });
    sendResponse({ success: true });
    return true;
  }
  if (message.type === 'GET_CANCEL_OUTGOING_STATE') {
    if (typeof getCancelOutgoingState === 'function') {
      sendResponse(getCancelOutgoingState());
    } else {
      sendResponse({ isRunning: false, isPaused: false, shouldStop: false, cancelCount: 0 });
    }
  }
  if (message.type === 'PAUSE_FRIEND_REQUESTS') {
    chrome.storage.local.set({ isPaused: true });
    if ((window as any).updateFriendProgress)
      (window as any).updateFriendProgress({ paused: true, status: 'Paused' });
  }
  if (message.type === 'RESUME_FRIEND_REQUESTS') {
    chrome.storage.local.set({ isPaused: false });
    if ((window as any).updateFriendProgress)
      (window as any).updateFriendProgress({
        paused: false,
        status: 'Running',
      });
  }
  if (message.type === 'STOP_FRIEND_REQUESTS') {
    (window as any).__stopFriendAutomation = true;
    (window as any).__friendAutomationActive = false; // Clear automation state
    const popup = document.getElementById('friend-progress-popup');
    if (popup) popup.remove();

    // Remove the FCE friend convert model div
    const fcePopup = document.getElementById('FCE_friend_convert_model');
    if (fcePopup) fcePopup.remove();
    chrome.storage.local.set({ buttonState: false });
    // Send completion message to popup when manually stopped
    chrome.runtime.sendMessage({
      type: 'FRIEND_REQUESTS_COMPLETED',
      sentCount: 0,
      completed: true,
    });
  }
  if (message.type === 'CHECK_AUTOMATION_STATUS') {
    // Check if automation is currently running
    const isRunning =
      !(window as any).__stopFriendAutomation &&
      !!(window as any).__friendAutomationActive;
    sendResponse({ isRunning });
    return true; // Keep message channel open for async response
  }
});

(window as any).sendFriendRequests = sendFriendRequests;
(window as any).cancelOutgoingRequests = cancelOutgoingRequests;

// console.log('Scripts loaded. Ready to call from popup React buttons.');
