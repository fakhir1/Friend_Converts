/**
 * Browser-Compatible Facebook Friends API
 * Copy and paste this entire script into browser console while on Facebook
 */

import {
  SessionData,
  ExtractedSessionData,
  autoExtractSessionData,
} from './helper';

// Extend Window interface for global variables
interface WindowExtended extends Window {
  FacebookFriendsAPI: typeof FacebookFriendsAPI;
  runFacebookFriendsAPI: (useAutoExtract?: boolean) => Promise<void>;
  autoExtractSessionData: () => ExtractedSessionData;
  facebookFriendsData: Friend[];
  downloadFriendsData: () => void;
}

// TypeScript Interfaces
interface Friend {
  id: string;
  name: string;
  profileUrl: string;
  cursor: string;
  image?: any;
  subtitle?: string;
}

interface GraphQLVariables {
  id: string;
  count: number;
  cursor: string | null;
  search: string | null;
}

interface RequestBodyParams {
  __a: string;
  __aaid: string;
  __ccg: string;
  __comet_req: string;
  __req: string;
  __rev: string;
  __user: string;
  av: string;
  doc_id: string;
  dpr: string;
  fb_api_caller_class: string;
  fb_api_req_friendly_name: string;
  fb_dtsg: string;
  server_timestamps: string;
  variables: string;
}

interface PageInfo {
  has_next_page: boolean;
  end_cursor?: string;
}

interface GraphQLNode {
  id: string;
  node: {
    id: string;
  };
  title: {
    text: string;
  };
  url: string;
  image?: any;
  subtitle_text?: string;
}

interface GraphQLEdge {
  cursor: string;
  node: GraphQLNode;
}

interface GraphQLResponse {
  data?: {
    node?: {
      pageItems?: {
        edges?: GraphQLEdge[];
        page_info?: PageInfo;
      };
    };
  };
}

// Session Configuration - Replace with your extracted data
const sessionConfig: SessionData = {
  // PASTE YOUR EXTRACTED SESSION DATA HERE
  cookies: 'REPLACE_WITH_YOUR_COOKIES',
  userId: 'REPLACE_WITH_YOUR_USER_ID',
  fbDtsg: 'REPLACE_WITH_YOUR_FB_DTSG',
  collectionId: 'REPLACE_WITH_YOUR_COLLECTION_ID', // Default collection ID
  jazoest: 'REPLACE_WITH_YOUR_JAZOEST',
  lsd: 'REPLACE_WITH_YOUR_LSD',
};

// Facebook Friends API Class
class FacebookFriendsAPI {
  private cookies: string;
  private userId: string;
  private fbDtsg: string;
  private requestCounter: number;
  private collectionId: string;

  constructor(sessionData: SessionData) {
    this.cookies = sessionData.cookies;
    this.userId = sessionData.userId;
    this.fbDtsg = sessionData.fbDtsg;
    this.requestCounter = 1;
    this.collectionId = sessionData.collectionId;
  }

  async getFriends(
    cursor: string | null = null,
    count: number = 8
  ): Promise<GraphQLResponse> {
    const variables = {
      id: this.collectionId,
      count: count,
      cursor: cursor,
      search: null,
    };

    const bodyParams = {
      __a: '1',
      __aaid: '0',
      __ccg: 'EXCELLENT',
      __comet_req: '15',
      __req: this.requestCounter.toString(),
      __rev: '1025787392',
      __user: this.userId,
      av: this.userId,
      doc_id: '4965618120193091',
      dpr: '1',
      fb_api_caller_class: 'RelayModern',
      fb_api_req_friendly_name:
        'ProfileCometAppCollectionListRendererPaginationQuery',
      fb_dtsg: this.fbDtsg,
      server_timestamps: 'true',
      variables: JSON.stringify(variables),
    };

    const body = new URLSearchParams(bodyParams).toString();

    try {
      const response = await fetch('https://www.facebook.com/api/graphql/', {
        method: 'POST',
        headers: {
          accept: 'application/json, text/plain, */*',
          'accept-language': 'en-US,en;q=0.9',
          'content-type': 'application/x-www-form-urlencoded;charset=utf-8',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
          cookie: this.cookies,
          referer: `https://www.facebook.com/${this.userId}/friends_all/`,
        },
        body: body,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.requestCounter++;
      return await response.json();
    } catch (error) {
      console.error('Error fetching friends:', error);
      throw error;
    }
  }

  parseFriendsData(response: GraphQLResponse): Friend[] {
    if (
      !response.data ||
      !response.data.node ||
      !response.data.node.pageItems
    ) {
      return [];
    }

    const edges = response.data.node.pageItems.edges || [];

    return edges.map((edge: GraphQLEdge) => ({
      id: edge.node.node.id,
      name: edge.node.title.text,
      profileUrl: edge.node.url,
      cursor: edge.cursor,
      image: edge.node.image,
      subtitle: edge.node.subtitle_text,
    }));
  }

  async getAllFriends(maxFriends: number = 0): Promise<Friend[]> {
    const allFriends = [];
    let cursor = null;
    let hasNextPage = true;
    let fetchedCount = 0;

    // console.log('Starting to fetch friends...');

    while (hasNextPage && (maxFriends === 0 || fetchedCount < maxFriends)) {
      try {
        // console.log(`Fetching page ${Math.floor(fetchedCount / 8) + 1}...`);

        const response = await this.getFriends(cursor, 8);
        const friends = this.parseFriendsData(response);

        if (friends.length === 0) {
          // console.log('No more friends found.');
          break;
        }

        allFriends.push(...friends);
        fetchedCount += friends.length;

        // Send progress update to popup
        try {
          chrome.runtime.sendMessage({
            type: 'FRIENDS_COLLECTION_PROGRESS',
            collected: allFriends.length,
            page: Math.floor(fetchedCount / 8) + 1,
          });
        } catch (error) {
          // Ignore messaging errors to avoid breaking the collection
          // console.log('Progress message failed:', error);
        }

        const lastFriend = friends[friends.length - 1];
        cursor = lastFriend.cursor;

        const pageInfo = response.data?.node?.pageItems?.page_info;
        hasNextPage = pageInfo?.has_next_page || friends.length === 8;

        // console.log(
        //   `Fetched ${friends.length} friends. Total: ${allFriends.length}`
        // );

        if (hasNextPage) {
          await this.delay(1000);
        }
      } catch (error) {
        console.error('Error in pagination:', error);
        break;
      }
    }

    // console.log(`Finished fetching. Total friends: ${allFriends.length}`);
    return allFriends;
  }

  delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Main function to run the API
async function runFacebookFriendsAPI(
  useAutoExtract: boolean = true
): Promise<void> {
  // console.log('Starting Facebook Friends API...');

  let sessionData: SessionData | ExtractedSessionData;

  if (useAutoExtract) {
    // console.log('Auto-extracting session data...');
    sessionData = autoExtractSessionData();
  } else {
    sessionData = sessionConfig;
  }

  // Validate session data
  if (!sessionData.cookies || !sessionData.userId || !sessionData.fbDtsg) {
    console.error('Missing required session data.');
    // console.log(
    //   'Make sure you are logged into Facebook and on a Facebook page.'
    // );
    return;
  }

  // Convert ExtractedSessionData to SessionData if needed
  const validatedSessionData: SessionData = {
    cookies: sessionData.cookies,
    userId: sessionData.userId as string, // We've validated it's not null above
    fbDtsg: sessionData.fbDtsg as string, // We've validated it's not null above
    collectionId: sessionData.collectionId,
    jazoest: sessionData.jazoest || undefined,
    lsd: sessionData.lsd || undefined,
  };

  const api = new FacebookFriendsAPI(validatedSessionData);

  try {
    console.log('🔍 Testing API connection...');

    // Test with first batch
    const firstBatch = await api.getFriends();
    const friends = api.parseFriendsData(firstBatch);

    if (friends.length > 0) {
      // console.log(
      //   `Successfully connected! Found ${friends.length} friends in first batch.`
      // );
      console.log(
        'First few friends:',
        friends.slice(0, 3).map((f: Friend) => f.name)
      );

      // Get more friends (limit to 50 for testing)
      // console.log('\n Fetching more friends...');
      const allFriends = await api.getAllFriends();

      // console.log(`\n Results:`);
      // console.log(`Total friends fetched: ${allFriends.length}`);
      // console.log(
      //   `Friend names: ${allFriends.map((f: Friend) => f.name).join(', ')}`
      // );

      // Store in global variable for easy access
      (window as any).facebookFriendsData = allFriends;
      // console.log('Friends data stored in window.facebookFriendsData');

      // Create downloadable JSON
      const dataStr = JSON.stringify(allFriends, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // console.log('To download the data as JSON file, run:');
      // console.log(`downloadFriendsData()`);

      (window as any).downloadFriendsData = function (): void {
        const a = document.createElement('a');
        a.href = url;
        a.download = 'facebook_friends_data.json';
        a.click();
        // console.log('Downloaded facebook_friends_data.json');
      };
    } else {
      // console.log(
      //   'No friends found. Check your session data or collection ID.'
      // );
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    // console.error('Error:', errorMessage);

    if (errorMessage.includes('401') || errorMessage.includes('403')) {
      // console.log('Authentication error. Your session may have expired.');
      // console.log('Try refreshing the page and running the script again.');
    }
  }
}

// Make functions available globally
(window as any).FacebookFriendsAPI = FacebookFriendsAPI;
(window as any).runFacebookFriendsAPI = runFacebookFriendsAPI;
(window as any).autoExtractSessionData = autoExtractSessionData;
