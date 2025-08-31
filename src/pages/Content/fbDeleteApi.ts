import { autoExtractSessionData, ExtractedSessionData } from './helper';

interface UnfriendResult {
  success: boolean;
  friendId: string;
  friendName?: string;
  error?: string;
}

interface UnfriendRequest {
  friendId: string;
  friendName?: string;
}

/**
 * Unfriend a single user using Facebook's GraphQL API
 * @param friendId The ID of the friend to unfriend
 * @param friendName Optional name for logging purposes
 * @param sessionData Optional session data, will be auto-extracted if not provided
 * @returns Promise with unfriend result
 */
export async function unfriendUser(
  friendId: string,
  friendName?: string,
  sessionData?: ExtractedSessionData
): Promise<UnfriendResult> {
  try {
    // Extract session data if not provided
    const session = sessionData || autoExtractSessionData();

    // Validate required session data
    if (!session.userId || !session.fbDtsg) {
      throw new Error('Missing required session data (userId or fbDtsg)');
    }

    console.log(`🔄 Attempting to unfriend: ${friendName || friendId}`);

    const response = await fetch('https://www.facebook.com/api/graphql/', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'x-fb-friendly-name': 'FriendingCometUnfriendMutation',
        cookie: session.cookies,
      },
      body: new URLSearchParams({
        fb_dtsg: session.fbDtsg,
        jazoest: session.jazoest || '25581',
        doc_id: '23930708339886851', // Unfriend mutation
        variables: JSON.stringify({
          input: {
            source: 'bd_profile_button',
            unfriended_user_id: friendId,
            actor_id: session.userId,
            client_mutation_id: '1',
          },
          scale: 1,
        }),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Check for GraphQL errors
    if (data.errors && data.errors.length > 0) {
      const errorMessage = data.errors.map((e: any) => e.message).join(', ');
      throw new Error(`GraphQL Error: ${errorMessage}`);
    }

    // Check if the unfriend operation was successful
    const unfriendData = data.data?.friend_remove?.unfriended_person;
    if (unfriendData && unfriendData.id) {
      // Verify the friendship status changed to indicate successful unfriending
      const friendshipStatus = unfriendData.friendship_status;

      // console.log(`Successfully unfriended: ${friendName || friendId}`);
      // console.log(`New friendship status: ${friendshipStatus}`);

      return {
        success: true,
        friendId,
        friendName,
      };
    } else {
      // Log the actual response data for debugging
      // console.log('Unfriend response data:', JSON.stringify(data, null, 2));
      throw new Error('Unfriend operation failed - no valid response data');
    }
  } catch (error) {
    console.error(`Failed to unfriend ${friendName || friendId}:`, error);
    return {
      success: false,
      friendId,
      friendName,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Unfriend multiple users with delay between requests
 * @param friendRequests Array of friend IDs and names to unfriend
 * @param delayMs Delay between unfriend requests in milliseconds (default: 2000ms)
 * @param onProgress Optional callback for progress updates
 * @returns Promise with array of unfriend results
 */
export async function unfriendMultipleUsers(
  friendRequests: UnfriendRequest[],
  delayMs: number = 2000,
  onProgress?: (
    completed: number,
    total: number,
    current: UnfriendRequest,
    result: UnfriendResult
  ) => void
): Promise<UnfriendResult[]> {
  console.log(
    `Starting batch unfriend operation for ${friendRequests.length} friends`
  );

  const results: UnfriendResult[] = [];
  const sessionData = autoExtractSessionData();

  // Validate session data once
  if (!sessionData.userId || !sessionData.fbDtsg) {
    const error =
      'Missing required session data. Please make sure you are logged in to Facebook.';
    console.error('', error);
    return friendRequests.map((req) => ({
      success: false,
      friendId: req.friendId,
      friendName: req.friendName,
      error,
    }));
  }

  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < friendRequests.length; i++) {
    const friendRequest = friendRequests[i];

    try {
      // Send progress update before processing
      if (onProgress) {
        onProgress(i, friendRequests.length, friendRequest, {
          success: false,
          friendId: friendRequest.friendId,
          friendName: friendRequest.friendName,
        });
      }

      // Unfriend the user
      const result = await unfriendUser(
        friendRequest.friendId,
        friendRequest.friendName,
        sessionData
      );

      results.push(result);

      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }

      // Send progress update after processing
      if (onProgress) {
        onProgress(i + 1, friendRequests.length, friendRequest, result);
      }

      // Add delay between requests (except for the last one)
      if (i < friendRequests.length - 1) {
        console.log(`⏳ Waiting ${delayMs}ms before next unfriend request...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      const result: UnfriendResult = {
        success: false,
        friendId: friendRequest.friendId,
        friendName: friendRequest.friendName,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      results.push(result);
      failureCount++;

      // Send progress update for error
      if (onProgress) {
        onProgress(i + 1, friendRequests.length, friendRequest, result);
      }
    }
  }

  // console.log(`Batch unfriend operation completed:`);
  // console.log(`Successful: ${successCount}`);
  // console.log(`Failed: ${failureCount}`);
  // console.log(`Total: ${friendRequests.length}`);

  return results;
}

// Make the functions available globally for content script access
(window as any).unfriendUser = unfriendUser;
(window as any).unfriendMultipleUsers = unfriendMultipleUsers;
