// Control state for cancel outgoing requests
let cancelOutgoingState = {
  isRunning: false,
  isPaused: false,
  shouldStop: false,
  cancelCount: 0,
};

export function pauseCancelOutgoing(): void {
  cancelOutgoingState.isPaused = true;
  console.log('Cancel outgoing requests paused - State updated:', cancelOutgoingState);
}

export function resumeCancelOutgoing(): void {
  cancelOutgoingState.isPaused = false;
  console.log('Cancel outgoing requests resumed - State updated:', cancelOutgoingState);
}

export function stopCancelOutgoing(): void {
  cancelOutgoingState.shouldStop = true;
  cancelOutgoingState.isRunning = false;
  console.log('Cancel outgoing requests stopped - State updated:', cancelOutgoingState);
}

export function getCancelOutgoingState() {
  return { ...cancelOutgoingState };
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function cancelOutgoingRequests(): Promise<void> {
  // Reset state for new session
  cancelOutgoingState = {
    isRunning: true,
    isPaused: false,
    shouldStop: false,
    cancelCount: 0,
  };

  // console.log('Starting to cancel outgoing requests...');

  // Notify background script that process has started
  chrome.runtime.sendMessage({
    type: 'UPDATE_CANCEL_OUTGOING_STATE',
    state: { ...cancelOutgoingState },
  });

  await delay(3000); // Let Facebook settle

  const sentReqBtn = Array.from(
    document.querySelectorAll('div[role="button"]')
  ).find(function (div) {
    const text = div.textContent || '';
    return text.toLowerCase().includes('view sent requests');
  });

  if (!sentReqBtn) {
    console.log("'View sent requests' button not found.");
    // Notify completion
    chrome.runtime.sendMessage({
      type: 'CANCEL_OUTGOING_COMPLETED',
      cancelCount: 0,
    });
    return;
  }

  sentReqBtn.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  });
  (sentReqBtn as HTMLElement).click();
  // console.log("Clicked 'View sent requests");

  await delay(3000);

  // Scroll the sent requests container to the bottom to load all requests
  const dynamicSelector =
    'xb57i2i x1q594ok x5lxg6s x78zum5 xdt5ytf x6ikm8r x1ja2u2z x1pq812k x1rohswg xfk6m8 x1yqm8si xjx87ck xx8ngbg xwo3gff x1n2onr6 x1oyok0e x1odjw0f x1e4zzel x1tbbn4q x1y1aw1k xyri2b xwib8y2 x1c1uobl';
  const dynamicScrollDiv = document.querySelector(
    `.${dynamicSelector.split(' ').join('.')}`
  );

  if (dynamicScrollDiv) {
    console.log('Scrolling to load all requests...');
    const scrollElement = dynamicScrollDiv as HTMLElement;

    // Keep scrolling until we can't scroll anymore
    let previousScrollTop = -1;
    while (true) {
      const currentScrollTop = scrollElement.scrollTop;

      // If scroll position hasn't changed, we've reached the bottom
      if (currentScrollTop === previousScrollTop) {
        console.log('Reached the bottom of the scroll container');
        break;
      }

      previousScrollTop = currentScrollTop;

      // Scroll down by a reasonable amount
      scrollElement.scrollTo({
        top: scrollElement.scrollTop + 1000,
        behavior: 'smooth',
      });

      await delay(2000); // Wait for content to load
    }
  }

  const cancelBtns = Array.from(
    document.querySelectorAll('div[aria-label="Cancel request"]')
  );
  if (!cancelBtns.length) {
    // console.log('No cancel buttons found.');
    // Notify completion
    chrome.runtime.sendMessage({
      type: 'CANCEL_OUTGOING_COMPLETED',
      cancelCount: 0,
    });
    // Send message to background script to remove the current tab
    chrome.runtime.sendMessage({ type: 'REMOVE_CURRENT_TAB' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Failed to remove tab:', chrome.runtime.lastError);
      } else {
        console.log('Tab removal requested successfully');
      }
    });
    return;
  }

  for (let i = 0; i < cancelBtns.length; i++) {
    // Check for pause
    while (cancelOutgoingState.isPaused) {
      await delay(500);
    }
    // Check for stop
    if (cancelOutgoingState.shouldStop) {
      // console.log('Cancel outgoing requests stopped by user.');
      break;
    }
    (cancelBtns[i] as HTMLElement).scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
    (cancelBtns[i] as HTMLElement).click();
    console.log(`Cancelled request #${i + 1}`);

    cancelOutgoingState.cancelCount = i + 1;
    // Update progress
    chrome.runtime.sendMessage({
      type: 'UPDATE_CANCEL_OUTGOING_STATE',
      state: { ...cancelOutgoingState },
    });

    await delay(1500);
  }

  if (cancelOutgoingState.shouldStop) {
    console.log(`Cancel outgoing stopped. Total canceled: ${cancelOutgoingState.cancelCount}`);
  } else {
    console.log(`Done. Cancelled ${cancelBtns.length} requests.`);
  }

  cancelOutgoingState.isRunning = false;

  // Notify completion
  chrome.runtime.sendMessage({
    type: 'CANCEL_OUTGOING_COMPLETED',
    cancelCount: cancelOutgoingState.cancelCount,
  });

  // Send message to background script to remove the current tab
  chrome.runtime.sendMessage({ type: 'REMOVE_CURRENT_TAB' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Failed to remove tab:', chrome.runtime.lastError);
    } else {
      // console.log('Tab removal requested successfully');
    }
  });
}

// Helper to wait for an element to appear
async function waitForElement(
  selector: string,
  timeout = 10000
): Promise<Element | null> {
  const interval = 200;
  const maxTries = Math.ceil(timeout / interval);
  let tries = 0;
  return new Promise((resolve) => {
    const check = () => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      tries++;
      if (tries * interval >= timeout) return resolve(null);
      setTimeout(check, interval);
    };
    check();
  });
}
