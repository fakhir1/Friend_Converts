/**
 * Helper functions and interfaces for Facebook API scripts
 */

// Common interfaces for session data
export interface SessionData {
  cookies: string;
  userId: string;
  fbDtsg: string;
  collectionId: string;
  jazoest?: string;
  lsd?: string;
  profileId?: string;
}

export interface ExtractedSessionData {
  cookies: string;
  userId: string | null;
  fbDtsg: string | null;
  collectionId: string;
  jazoest: string | null;
  lsd: string | null;
  profileId?: string | null;
}

// Interface for friend data with engagement
export interface FriendWithEngagement {
  id: string;
  name: string;
  profileUrl: string;
  cursor: string;
  image?: any;
  subtitle?: string;
  engagement: {
    totalReactions: number;
    totalComments: number;
    totalShares: number;
    reactionBreakdown: { [reactionType: string]: number };
    lastEngagementDate: string | null;
    engagementScore: number; // Weighted score based on activity
  };
}

// Interface for engagement user data (from posts API)
export interface EngagementUser {
  id: string;
  name: string;
  profileUrl: string;
  profilePicture?: string;
}

// Interface for post engagement data
export interface PostEngagementData {
  reactions: Array<{
    id: string;
    reactionType: string;
    user: EngagementUser;
  }>;
  comments: Array<{
    id: string;
    author: EngagementUser;
    text: string;
    timestamp: string | null;
    likeCount: number;
    replyCount: number;
  }>;
  shares: Array<{
    id: string;
    user: EngagementUser;
    text: string;
    timestamp: string | null;
    shareType: string;
  }>;
}

// Auto-extract session data function
export function autoExtractSessionData(): ExtractedSessionData {
  // Try to extract collectionId from the page if available
  const collectionId =
    document.querySelector<HTMLInputElement>('[name="collection_id"]')?.value ||
    '';

  const extractedData: ExtractedSessionData = {
    cookies: document.cookie,
    userId: document.cookie.match(/c_user=(\d+)/)?.[1] || null,
    fbDtsg: (() => {
      const fbDtsgElement =
        document.querySelector<HTMLInputElement>('[name="fb_dtsg"]');
      if (fbDtsgElement) return fbDtsgElement.value;

      const scripts = document.querySelectorAll('script');
      for (let i = 0; i < scripts.length; i++) {
        const script = scripts[i];
        const content = script.textContent || script.innerHTML;
        const match = content.match(/"DTSGInitialData"[^}]*"token":"([^"]+)"/);
        if (match) return match[1];
      }
      return null;
    })(),
    collectionId: (() => {
      const userId = document.cookie.match(/c_user=(\d+)/)?.[1];
      if (userId) {
        return btoa(`app_collection:${userId}:2356318349:2`);
      }
      // Try alternative collection ID format
      return '';
    })(),
    jazoest:
      document.querySelector<HTMLInputElement>('[name="jazoest"]')?.value ||
      null,
    lsd:
      document.querySelector<HTMLInputElement>('[name="lsd"]')?.value || null,
  };

  // Extract profile ID from URL
  const urlMatch = window.location.href.match(/facebook\.com\/([^\/\?]+)/);
  if (urlMatch && urlMatch[1] !== 'www') {
    if (urlMatch[1].match(/^\d+$/)) {
      extractedData.profileId = urlMatch[1];
    } else {
      extractedData.profileId = extractedData.userId;
    }
  } else {
    extractedData.profileId = extractedData.userId;
  }

  console.log('🔍 Auto-extracted session data:');
  console.log(JSON.stringify(extractedData, null, 2));

  return extractedData;
}

/**
 * Merge friends data with engagement data from posts
 * @param friendsData Array of friend objects from friends API
 * @param postsData Array of post objects with engagement data from posts API
 * @returns Array of friends with engagement statistics
 */
export function mergeFriendsWithEngagement(
  friendsData: any[],
  postsData: any[]
): FriendWithEngagement[] {
  // console.log('Starting friends and engagement data merge...');
  // console.log(
  //   `Processing ${friendsData.length} friends and ${postsData.length} posts`
  // );

  // Create a map to track engagement by user ID
  const engagementMap = new Map<
    string,
    {
      totalReactions: number;
      totalComments: number;
      totalShares: number;
      reactionBreakdown: { [key: string]: number };
      lastEngagementDate: string | null;
      name: string;
      profileUrl: string;
    }
  >();

  // Process all posts and their engagement data
  postsData.forEach((post, postIndex) => {
    if (!post.engagement) return;

    const { reactions, comments, shares } = post.engagement;

    // Process reactions
    if (reactions && reactions.list) {
      reactions.list.forEach((reaction: any) => {
        if (reaction.user && reaction.user.id) {
          const userId = reaction.user.id;

          if (!engagementMap.has(userId)) {
            engagementMap.set(userId, {
              totalReactions: 0,
              totalComments: 0,
              totalShares: 0,
              reactionBreakdown: {},
              lastEngagementDate: null,
              name: reaction.user.name || 'Unknown',
              profileUrl: reaction.user.profileUrl || '',
            });
          }

          const userData = engagementMap.get(userId)!;
          userData.totalReactions++;

          const reactionType = reaction.reactionType || 'UNKNOWN';
          userData.reactionBreakdown[reactionType] =
            (userData.reactionBreakdown[reactionType] || 0) + 1;

          // Update last engagement date (posts are usually in chronological order)
          if (
            post.timestamp &&
            (!userData.lastEngagementDate ||
              post.timestamp > userData.lastEngagementDate)
          ) {
            userData.lastEngagementDate = post.timestamp;
          }
        }
      });
    }

    // Process comments
    if (comments && comments.list) {
      comments.list.forEach((comment: any) => {
        if (comment.author && comment.author.id) {
          const userId = comment.author.id;

          if (!engagementMap.has(userId)) {
            engagementMap.set(userId, {
              totalReactions: 0,
              totalComments: 0,
              totalShares: 0,
              reactionBreakdown: {},
              lastEngagementDate: null,
              name: comment.author.name || 'Unknown',
              profileUrl: comment.author.profileUrl || '',
            });
          }

          const userData = engagementMap.get(userId)!;
          userData.totalComments++;

          // Update last engagement date
          if (
            comment.timestamp &&
            (!userData.lastEngagementDate ||
              comment.timestamp > userData.lastEngagementDate)
          ) {
            userData.lastEngagementDate = comment.timestamp;
          }
        }
      });
    }

    // Process shares
    if (shares && shares.list) {
      shares.list.forEach((share: any) => {
        if (share.user && share.user.id) {
          const userId = share.user.id;

          if (!engagementMap.has(userId)) {
            engagementMap.set(userId, {
              totalReactions: 0,
              totalComments: 0,
              totalShares: 0,
              reactionBreakdown: {},
              lastEngagementDate: null,
              name: share.user.name || 'Unknown',
              profileUrl: share.user.profileUrl || '',
            });
          }

          const userData = engagementMap.get(userId)!;
          userData.totalShares++;

          // Update last engagement date
          if (
            share.timestamp &&
            (!userData.lastEngagementDate ||
              share.timestamp > userData.lastEngagementDate)
          ) {
            userData.lastEngagementDate = share.timestamp;
          }
        }
      });
    }
  });

  // console.log(
  //   `Found engagement data for ${engagementMap.size} unique users`
  // );

  // Merge friends data with engagement data
  const mergedFriends: FriendWithEngagement[] = friendsData.map((friend) => {
    const friendId = friend.id;
    const engagementData = engagementMap.get(friendId);

    // Calculate engagement score (weighted: reactions=1, comments=3, shares=5)
    const engagementScore = engagementData
      ? engagementData.totalReactions * 1 +
      engagementData.totalComments * 3 +
      engagementData.totalShares * 5
      : 0;

    return {
      id: friend.id,
      name: friend.name,
      profileUrl: friend.profileUrl,
      cursor: friend.cursor,
      image: friend.image,
      subtitle: friend.subtitle,
      engagement: {
        totalReactions: engagementData?.totalReactions || 0,
        totalComments: engagementData?.totalComments || 0,
        totalShares: engagementData?.totalShares || 0,
        reactionBreakdown: engagementData?.reactionBreakdown || {},
        lastEngagementDate: engagementData?.lastEngagementDate || null,
        engagementScore: engagementScore,
      },
    };
  });

  // Sort by engagement score (most active first)
  mergedFriends.sort(
    (a, b) => b.engagement.engagementScore - a.engagement.engagementScore
  );

  // Log statistics
  const totalEngagedFriends = mergedFriends.filter(
    (f) => f.engagement.engagementScore > 0
  ).length;
  const avgEngagementScore =
    mergedFriends.reduce((sum, f) => sum + f.engagement.engagementScore, 0) /
    mergedFriends.length;

  // console.log('Engagement merge statistics:');
  // console.log(`Total friends: ${mergedFriends.length}`);
  // console.log(`Friends with engagement: ${totalEngagedFriends}`);
  // console.log(`Average engagement score: ${avgEngagementScore.toFixed(2)}`);
  // console.log(
  //   `Top engager: ${mergedFriends[0]?.name} (score: ${mergedFriends[0]?.engagement.engagementScore})`
  // );

  return mergedFriends;
}

/**
 * Get engagement summary statistics
 * @param mergedFriends Array of friends with engagement data
 * @returns Summary statistics object
 */
export function getEngagementSummary(mergedFriends: FriendWithEngagement[]) {
  const totalReactions = mergedFriends.reduce(
    (sum, f) => sum + f.engagement.totalReactions,
    0
  );
  const totalComments = mergedFriends.reduce(
    (sum, f) => sum + f.engagement.totalComments,
    0
  );
  const totalShares = mergedFriends.reduce(
    (sum, f) => sum + f.engagement.totalShares,
    0
  );
  const engagedFriends = mergedFriends.filter(
    (f) => f.engagement.engagementScore > 0
  );

  // Get top engagers
  const topEngagers = mergedFriends
    .slice(0, 10)
    .filter((f) => f.engagement.engagementScore > 0);

  // Reaction type breakdown
  const reactionTypeBreakdown: { [key: string]: number } = {};
  mergedFriends.forEach((friend) => {
    Object.entries(friend.engagement.reactionBreakdown).forEach(
      ([type, count]) => {
        reactionTypeBreakdown[type] =
          (reactionTypeBreakdown[type] || 0) + count;
      }
    );
  });

  return {
    totalFriends: mergedFriends.length,
    engagedFriends: engagedFriends.length,
    engagementRate: (
      (engagedFriends.length / mergedFriends.length) *
      100
    ).toFixed(2),
    totalReactions,
    totalComments,
    totalShares,
    totalEngagements: totalReactions + totalComments + totalShares,
    avgEngagementPerFriend: (
      (totalReactions + totalComments + totalShares) /
      mergedFriends.length
    ).toFixed(2),
    topEngagers: topEngagers.map((f) => ({
      name: f.name,
      score: f.engagement.engagementScore,
      reactions: f.engagement.totalReactions,
      comments: f.engagement.totalComments,
      shares: f.engagement.totalShares,
    })),
    reactionTypeBreakdown,
  };
}
