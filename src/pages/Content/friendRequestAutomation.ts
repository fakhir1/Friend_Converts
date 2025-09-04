export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitUntilResume(): Promise<void> {
  return new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      chrome.storage.local.get('isPaused', (data: { isPaused?: boolean }) => {
        if (!data.isPaused) {
          clearInterval(interval);
          resolve();
        } else {
          console.log('Paused... Waiting to resume.');
        }
      });
    }, 1000);
  });
}

export async function waitForAddFriendButtons(
  timeout: number = 15000
): Promise<Element[]> {
  const interval = 500;
  const maxTries = timeout / interval;
  let tries = 0;
  return new Promise<Element[]>((resolve) => {
    const check = setInterval(() => {
      const buttons = Array.from(
        document.querySelectorAll('div[role="button"], span')
      ).filter((el) => {
        const text = el.textContent?.toLowerCase();
        // Only include buttons that say "Add Friend" and exclude already friends
        return (
          text?.includes('add friend') &&
          !text?.includes('friends') && // Exclude "Friends" button
          !text?.includes('following') && // Exclude "Following" button
          !text?.includes('message') && // Exclude "Message" button
          !text?.includes('pending')
        ); // Exclude "Pending" requests
      });

      if (buttons.length > 0 || tries >= maxTries) {
        clearInterval(check);
        resolve(buttons);
      }

      tries++;
    }, interval);
  });
}

export async function sendFriendRequests(
  keywords: string[],
  maxRequests: number,
  delayTime: number,
  useKeywordFilter: boolean = true // Default to true to preserve existing behavior
): Promise<void> {
  let sentCount = 0;
  const processedUsers = new Set<string>();
  let batchNumber = 0;

  // Set automation state flags
  (window as any).__friendAutomationActive = true;
  (window as any).__stopFriendAutomation = false;

  // Suppress Facebook's internal error logging during automation
  suppressFacebookErrors();

  (window as any).mountProgressPopup && (window as any).mountProgressPopup();
  (window as any).updateFriendProgress &&
    (window as any).updateFriendProgress({
      status: 'Is sending friend request',
      sent: 0,
      limit: maxRequests,
      scanning: true,
      totalMembers: 0,
      paused: false,
    });

  while (sentCount < maxRequests && !(window as any).__stopFriendAutomation) {
    batchNumber++;
    // 1. Get currently visible Add Friend buttons
    const addFriendButtons = await waitForAddFriendButtons();
    let newButtons = addFriendButtons.filter((btn) => {
      let card: HTMLElement | null = btn as HTMLElement;
      for (let j = 0; j < 6; j++) {
        card = card?.parentElement as HTMLElement | null;
        if (!card) break;
      }
      if (!card) return false;
      const userIdentifier = card.innerText.trim();
      return !processedUsers.has(userIdentifier);
    });

    if (newButtons.length === 0) {
      // Try to scroll and load more
      await scrollToLoadMore(batchNumber);
      // Wait for new batch
      const foundNew = await waitForNewBatch(processedUsers);
      if (!foundNew) {
        // No new users loaded after several attempts
        break;
      }
      continue;
    }

    for (let i = 0; i < newButtons.length; i++) {
      if ((window as any).__stopFriendAutomation) break;
      if (maxRequests && sentCount >= maxRequests) {
        (window as any).updateFriendProgress &&
          (window as any).updateFriendProgress({
            status: `Reached max requests limit: ${maxRequests}. Stopping.`,
            sent: sentCount,
            scanning: false,
          });
        // Remove the progress popups when limit is reached
        setTimeout(() => {
          const popup = document.getElementById('friend-progress-popup');
          if (popup) popup.remove();

          const fcePopup = document.getElementById('FCE_friend_convert_model');
          if (fcePopup) fcePopup.remove();
        }, 4000); // Wait 4 seconds to show the completion message before removing
        break;
      }

      await new Promise<void>((checkPauseResolve) => {
        chrome.storage.local.get(
          'isPaused',
          async (data: { isPaused?: boolean }) => {
            if (data.isPaused) {
              await waitUntilResume();
            }
            checkPauseResolve();
          }
        );
      });

      const btn = newButtons[i] as HTMLElement;
      let card: HTMLElement | null = btn;
      for (let j = 0; j < 6; j++) {
        card = card?.parentElement as HTMLElement | null;
        if (!card) break;
      }
      if (!card) continue;
      const userIdentifier = card.innerText.trim();
      if (processedUsers.has(userIdentifier)) continue;

      // Gather all possible text fields for matching (role, work, location, etc.)
      const allTextNodes = [
        ...Array.from(card.querySelectorAll('span')),
        ...Array.from(card.querySelectorAll('div')),
      ];

      let match: Element | undefined;
      let shouldSendRequest = false;

      if (useKeywordFilter && keywords.length > 0) {
        // Original keyword matching logic
        match = allTextNodes.find((el) => {
          const text = el.innerText?.toLowerCase().trim();
          if (!text) return false;
          return keywords.some((keyword) => {
            const words = keyword.toLowerCase().split(/\s+/);
            return words.some((word) => word && text.includes(word));
          });
        });
        shouldSendRequest = !!match;
      } else {
        // No keyword filter - send requests to all users
        shouldSendRequest = true;
        match = allTextNodes[0] || card; // Use first element for display purposes
      }

      if (shouldSendRequest) {
        const statusMessage = useKeywordFilter && keywords.length > 0
          ? `Keyword match "${(match as HTMLElement)?.innerText || 'found'}" → Preparing to send request.`
          : `No keyword filter → Preparing to send request.`;

        (window as any).updateFriendProgress &&
          (window as any).updateFriendProgress({
            status: statusMessage,
            sent: sentCount,
          });
        btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await delay(1000);
        try {
          if (btn.offsetParent !== null) {
            // Validate button before clicking
            const isValidButton = isValidAddFriendButton(btn, card);
            if (isValidButton) {
              // Add additional safety check
              const buttonText = btn.textContent?.toLowerCase().trim() || '';
              if (buttonText === 'add friend') {
                // Wrap click in try-catch to handle Facebook's internal errors
                try {
                  btn.click();
                  await delay(2000); // Wait for any confirmation dialog
                  // Check for any warning or confirmation dialog
                  const warningSelector =
                    document.querySelector('[aria-label="OK"]');
                  if (warningSelector) {
                    (warningSelector as HTMLElement).click();
                    // Do not increase sentCount if warning dialog appeared
                  } else {
                    sentCount++;
                  }
                  processedUsers.add(userIdentifier);
                  const displayText = match ? (match as HTMLElement).innerText || 'user' : 'user';
                  (window as any).updateFriendProgress &&
                    (window as any).updateFriendProgress({
                      status: `Friend request sent to: ${displayText}. Total sent: ${sentCount}`,
                      sent: sentCount,
                    });
                } catch (clickError) {
                  // console.error(
                  //   'Facebook internal error on button click:',
                  //   clickError
                  // );
                  (window as any).updateFriendProgress &&
                    (window as any).updateFriendProgress({
                      status: `Click error (Facebook internal) → Skipped. Error: ${clickError}`,
                      sent: sentCount,
                    });
                  processedUsers.add(userIdentifier);
                }
              } else {
                console.warn('Button text validation failed:', buttonText);
                (window as any).updateFriendProgress &&
                  (window as any).updateFriendProgress({
                    status: `Button text invalid ("${buttonText}") → Skipped.`,
                    sent: sentCount,
                  });
                processedUsers.add(userIdentifier);
              }
            } else {
              (window as any).updateFriendProgress &&
                (window as any).updateFriendProgress({
                  status: `Invalid button state → Skipped.`,
                  sent: sentCount,
                });
              processedUsers.add(userIdentifier);
            }
          } else {
            (window as any).updateFriendProgress &&
              (window as any).updateFriendProgress({
                status: `Button not visible → Skipped.`,
                sent: sentCount,
              });
          }
        } catch (e) {
          (window as any).updateFriendProgress &&
            (window as any).updateFriendProgress({
              status: `Click failed → ${e}`,
              sent: sentCount,
            });
        }
        await delay(delayTime * 1000);
      } else {
        (window as any).updateFriendProgress &&
          (window as any).updateFriendProgress({
            status: `No keyword match → Skipping.`,
            sent: sentCount,
          });
        processedUsers.add(userIdentifier);
      }
    }
    // After processing batch, scroll to load more
    await scrollToLoadMore(batchNumber);
    // Wait for new batch
    await waitForNewBatch(processedUsers);
  }
  (window as any).updateFriendProgress &&
    (window as any).updateFriendProgress({
      status: `Automation finished. Total requests sent: ${sentCount}`,
      sent: sentCount,
      scanning: false,
    });
  const popup = document.getElementById('friend-progress-popup');
  if (popup) popup.remove();
  chrome.storage.local.set({ isRunning: false });

  // Clear automation state flags
  (window as any).__friendAutomationActive = false;
  (window as any).__stopFriendAutomation = false;

  // Send completion message to popup
  chrome.runtime.sendMessage({
    type: 'FRIEND_REQUESTS_COMPLETED',
    sentCount,
    completed: true,
  });
}

// Helper: Scroll to load more members
async function scrollToLoadMore(batchNumber: number) {
  // Try to scroll the main window or a specific container
  // You may need to adjust the selector for your site
  window.scrollBy({ top: 600 + batchNumber * 100, behavior: 'smooth' });
  await delay(1500); // Wait for new content to load
}

// Helper: Wait for new Add Friend buttons not in processedUsers
async function waitForNewBatch(
  processedUsers: Set<string>,
  timeout = 8000
): Promise<boolean> {
  const interval = 800;
  const maxTries = Math.ceil(timeout / interval);
  let tries = 0;
  return new Promise((resolve) => {
    const check = setInterval(() => {
      const buttons = Array.from(
        document.querySelectorAll('div[role="button"], span')
      );
      let foundNew = false;
      for (const btn of buttons) {
        let card: HTMLElement | null = btn as HTMLElement;
        for (let j = 0; j < 6; j++) {
          card = card?.parentElement as HTMLElement | null;
          if (!card) break;
        }
        if (!card) continue;
        const userIdentifier = card.innerText.trim();
        if (!processedUsers.has(userIdentifier)) {
          foundNew = true;
          break;
        }
      }
      if (foundNew || tries >= maxTries) {
        clearInterval(check);
        resolve(foundNew);
      }
      tries++;
    }, interval);
  });
}

// Helper function to validate friend request button before clicking
function isValidAddFriendButton(
  button: HTMLElement,
  card: HTMLElement
): boolean {
  try {
    const buttonText = button.textContent?.toLowerCase().trim() || '';

    // Check button text - should only be "Add Friend"
    if (!buttonText.includes('add friend')) {
      return false;
    }

    // Exclude buttons that indicate already connected
    const excludeTexts = [
      'friends',
      'following',
      'message',
      'pending',
      'requested',
    ];
    if (excludeTexts.some((text) => buttonText.includes(text))) {
      return false;
    }

    // Check the card for friendship status indicators
    const cardText = card.textContent?.toLowerCase() || '';
    const friendshipIndicators = [
      'already friends',
      'friends since',
      'following',
      'follows you',
      'friend request sent',
      'pending',
    ];

    if (
      friendshipIndicators.some((indicator) => cardText.includes(indicator))
    ) {
      console.log(
        'Skipping user - friendship status detected:',
        cardText.substring(0, 100)
      );
      return false;
    }

    // Check for mutual friends or other indicators
    const statusElements = card.querySelectorAll('[data-testid], [aria-label]');
    for (let i = 0; i < statusElements.length; i++) {
      const element = statusElements[i];
      const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || '';
      const testId = element.getAttribute('data-testid')?.toLowerCase() || '';

      if (ariaLabel.includes('friends') || testId.includes('friend')) {
        console.log('Skipping user - friendship indicator found in attributes');
        return false;
      }
    }

    return true;
  } catch (error) {
    // console.error('Error validating friend request button:', error);
    return false;
  }
}

// Helper function to temporarily suppress Facebook's ErrorUtils logging
function suppressFacebookErrors() {
  try {
    // Store original console.error
    const originalConsoleError = console.error;

    // Override console.error to filter Facebook internal errors
    console.error = function (...args) {
      const message = args.join(' ');

      // Filter out known Facebook internal errors that we can't control
      const ignoredErrors = [
        'getAddFriendButton Invalid friendship status',
        'ErrorUtils caught an error',
        'ARE_FRIENDS',
        'Invalid friendship status on add friend button',
      ];

      const shouldIgnore = ignoredErrors.some((error) =>
        message.includes(error)
      );

      if (!shouldIgnore) {
        originalConsoleError.apply(console, args);
      }
    };

    // Restore original console.error after 30 seconds
    setTimeout(() => {
      console.error = originalConsoleError;
    }, 30000);
  } catch (error) { }
}
