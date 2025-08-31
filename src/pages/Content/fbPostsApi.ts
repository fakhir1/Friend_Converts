/**
 * Facebook Posts Scraper - Clean Version
 * Gets ALL posts from timeline with reactions, comments, and shares
 *
 * Usage:
 * 1. Open Facebook profile page in browser
 * 2. Paste this code in browser console
 * 3. Run: getAllPostsWithEngagement()
 * 4. Download results with: downloadPostsData()
 */

import {
  SessionData,
  ExtractedSessionData,
  autoExtractSessionData,
} from './helper';

// TypeScript Interfaces for Posts API
interface PostSessionData extends SessionData {
  profileId?: string;
}

interface Post {
  postId: string;
  type: string;
  cursor: string;
  timestamp: string | null;
  creationTime: number;
  url: string | null;
  wwwURL: string | null;
  author: Author | null;
  content: PostContent;
  media: MediaItem[];
  privacy: Privacy | null;
  rawNodeKeys: string[];
  engagement?: PostEngagement;
}

interface Author {
  id: string;
  name: string;
  username: string | null;
  profileUrl: string;
  type: string;
}

interface PostContent {
  text: string | null;
  hasText: boolean;
  type: 'text_post' | 'media_only';
}

interface MediaItem {
  type: 'photo' | 'image' | 'video';
  id?: string;
  url: string | null;
  width?: number | null;
  height?: number | null;
  thumbnail?: string | null;
}

interface Privacy {
  baseState: string;
  allow: any[];
  deny: any[];
}

interface PostEngagement {
  reactions: ReactionData;
  comments: CommentData;
  shares: ShareData;
  pagination: EngagementPagination;
}

interface ReactionData {
  total: number;
  breakdown: { [key: string]: number };
  list: Reaction[];
  pagination?: PaginationInfo;
}

interface CommentData {
  total: number;
  list: Comment[];
}

interface ShareData {
  total: number;
  list: Share[];
  pagination?: PaginationInfo;
}

interface EngagementPagination {
  commentPagesLoaded: number;
  allCommentsLoaded: boolean;
  reactionPagesLoaded: number;
  allReactionsLoaded: boolean;
  sharePagesLoaded: number;
  allSharesLoaded: boolean;
}

interface PaginationInfo {
  pagesLoaded: number;
  allCommentsLoaded?: boolean;
  allReactionsLoaded?: boolean;
  allSharesLoaded?: boolean;
  hasNextPage?: boolean;
  endCursor?: string | null;
}

interface Reaction {
  id: string;
  reactionType: string;
  user: {
    id: string;
    name: string;
    profileUrl: string;
    profilePicture: string;
  };
}

interface Comment {
  id: string;
  author: {
    id: string;
    name: string;
    profileUrl: string;
    profilePicture: string;
  };
  text: string;
  timestamp: string | null;
  likeCount: number;
  replyCount: number;
}

interface Share {
  id: string;
  user: {
    id: string;
    name: string;
    profileUrl: string;
    profilePicture: string;
  };
  text: string;
  timestamp: string | null;
  shareType: string;
}

interface PostsResponse {
  posts: Post[];
  pagination: {
    hasNextPage: boolean;
    endCursor: string | null;
    totalCount: number | null;
  } | null;
}

interface GraphQLPostsResponse {
  data?: {
    node?: {
      timeline_list_feed_units?: {
        edges?: any[];
        page_info?: {
          has_next_page: boolean;
          end_cursor: string;
        };
        count?: number;
      };
    };
  };
}

// Extend Window interface
declare global {
  interface Window {
    FacebookPostsAPI: typeof FacebookPostsAPI;
    getAllPostsWithEngagement: (
      profileId?: string | null,
      includeEngagement?: boolean,
      postLimit?: number
    ) => Promise<Post[]>;
    allFacebookPostsWithEngagement: Post[];
    downloadPostsData: () => void;
  }
}

class FacebookPostsAPI {
  private cookies: string;
  private userId: string;
  private fbDtsg: string;
  private lsd: string;
  private requestCounter: number;
  private profileId: string;

  constructor(sessionData: PostSessionData) {
    this.cookies = sessionData.cookies;
    this.userId = sessionData.userId;
    this.fbDtsg = sessionData.fbDtsg;
    this.lsd = sessionData.lsd || '';
    this.requestCounter = 1;
    this.profileId = sessionData.profileId || sessionData.userId;
  }

  // Main function to get posts from timeline
  async getPosts(
    cursor: string | null = null,
    count: number = 10,
    profileId: string | null = null
  ): Promise<GraphQLPostsResponse> {
    const targetProfileId = profileId || this.profileId;

    const variables = {
      UFI2CommentsProvider_commentsKey: 'ProfileCometTimelineRoute',
      afterTime: null,
      beforeTime: null,
      count: count,
      cursor: cursor,
      displayCommentsContextEnableComment: null,
      displayCommentsContextIsAdPreview: null,
      displayCommentsContextIsAggregatedShare: null,
      displayCommentsContextIsStorySet: null,
      displayCommentsFeedbackContext: null,
      feedLocation: 'TIMELINE',
      feedbackSource: 0,
      focusCommentID: null,
      memorializedSplitTimeFilter: null,
      omitPinnedPost: true,
      postedBy: null,
      privacy: null,
      privacySelectorRenderLocation: 'COMET_STREAM',
      renderLocation: 'timeline',
      scale: 1.5,
      should_show_profile_pinned_post: true,
      stream_count: Math.min(count * 3, 50), // Dynamic stream_count
      taggedInOnly: null,
      useDefaultActor: false,
      id: targetProfileId,
    };

    const bodyParams = {
      __a: '1',
      __aaid: '0',
      __ccg: 'EXCELLENT',
      __comet_req: '15',
      __req: this.requestCounter.toString(),
      __rev: '1025894367',
      __user: this.userId,
      av: this.userId,
      doc_id: '4430909743683968',
      dpr: '1',
      fb_api_caller_class: 'RelayModern',
      fb_api_req_friendly_name: 'ProfileCometTimelineFeedRefetchQuery',
      fb_dtsg: this.fbDtsg,
      jazoest: '25489',
      lsd: this.lsd,
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
          priority: 'u=1, i',
          'sec-ch-prefers-color-scheme': 'dark',
          'sec-ch-ua':
            '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
          cookie: this.cookies,
          referer: `https://www.facebook.com/${targetProfileId}/`,
        },
        body: body,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.requestCounter++;
      const responseText = await response.text();

      try {
        // Parse multiple JSON objects from Facebook response
        let allJsonObjects = [];
        let mainJsonData = null;

        try {
          mainJsonData = JSON.parse(responseText);
          allJsonObjects.push(mainJsonData);
        } catch (firstError) {
          // console.log('Parsing multiple JSON objects from response...');

          let currentPos = 0;
          while (currentPos < responseText.length) {
            const jsonStart = responseText.indexOf('{"', currentPos);
            if (jsonStart === -1) break;

            let braceCount = 0;
            let jsonEnd = -1;

            for (let i = jsonStart; i < responseText.length; i++) {
              if (responseText[i] === '{') {
                braceCount++;
              } else if (responseText[i] === '}') {
                braceCount--;
                if (braceCount === 0) {
                  jsonEnd = i + 1;
                  break;
                }
              }
            }

            if (jsonEnd === -1) break;

            try {
              const jsonString = responseText.substring(jsonStart, jsonEnd);
              const jsonObj = JSON.parse(jsonString);
              allJsonObjects.push(jsonObj);

              if (!mainJsonData && jsonObj.data && jsonObj.data.node) {
                mainJsonData = jsonObj;
              }
            } catch (parseError) {
              // Skip invalid JSON objects
            }

            currentPos = jsonEnd;
          }
        }

        if (!mainJsonData) {
          throw new Error('No valid main JSON object found');
        }

        // Look for deferred page_info in other JSON objects
        let deferredPageInfo = null;
        for (const jsonObj of allJsonObjects) {
          if (
            jsonObj.label &&
            jsonObj.label.includes('page_info') &&
            jsonObj.data &&
            jsonObj.data.page_info
          ) {
            deferredPageInfo = jsonObj.data.page_info;
            break;
          }
        }

        // Merge deferred page_info into main data structure
        if (
          deferredPageInfo &&
          mainJsonData.data &&
          mainJsonData.data.node &&
          mainJsonData.data.node.timeline_list_feed_units
        ) {
          mainJsonData.data.node.timeline_list_feed_units.page_info =
            deferredPageInfo;
        }

        return mainJsonData;
      } catch (jsonError: unknown) {
        const errorMessage =
          jsonError instanceof Error ? jsonError.message : 'Unknown error';
        // console.error('JSON Parse Error:', jsonError);
        throw new Error(`Invalid JSON response: ${errorMessage}`);
      }
    } catch (error) {
      // console.error('Error fetching posts:', error);
      throw error;
    }
  }

  // Parse posts data from API response
  parsePostsData(response: GraphQLPostsResponse): PostsResponse {
    if (
      !response.data ||
      !response.data.node ||
      !response.data.node.timeline_list_feed_units
    ) {
      return { posts: [], pagination: null };
    }

    const feedUnits = response.data.node.timeline_list_feed_units;
    const edges = feedUnits.edges || [];

    // Extract pagination info
    const pagination = {
      hasNextPage: feedUnits.page_info?.has_next_page || false,
      endCursor:
        feedUnits.page_info?.end_cursor ||
        (edges.length > 0 ? edges[edges.length - 1].cursor : null),
      totalCount: feedUnits.count || null,
    };

    return {
      posts: this.extractPostInfo(edges),
      pagination: pagination,
    };
  }

  // Extract basic post information
  extractPostInfo(edges: any[]): Post[] {
    return edges.map((edge: any, index: number): Post => {
      const node = edge.node;

      return {
        postId: node.id || `post_${index}`,
        type: node.__typename || 'Unknown',
        cursor: edge.cursor,
        timestamp: node.creation_time
          ? new Date(node.creation_time * 1000).toISOString()
          : null,
        creationTime: node.creation_time,
        url: node.url || null,
        wwwURL: node.wwwURL || null,
        author:
          this.extractAuthorInfo(node.actors) ||
          this.findAuthorRecursively(node),
        content: this.extractPostContent(node),
        media: this.extractMediaInfo(node),
        privacy: this.extractPrivacyInfo(node),
        rawNodeKeys: Object.keys(node),
      };
    });
  }

  // Find author info recursively
  findAuthorRecursively(node: any): Author | null {
    const authorKeys = ['actors', 'actor', 'author', 'owner', 'user'];

    for (const key of authorKeys) {
      if (node[key]) {
        if (Array.isArray(node[key]) && node[key].length > 0) {
          const author = node[key][0];
          if (author.name || author.id) {
            return {
              id: author.id,
              name: author.name,
              username: author.url ? author.url.split('/').pop() : null,
              profileUrl: author.url,
              type: author.__typename,
            };
          }
        } else if (node[key].name || node[key].id) {
          const author = node[key];
          return {
            id: author.id,
            name: author.name,
            username: author.url ? author.url.split('/').pop() : null,
            profileUrl: author.url,
            type: author.__typename,
          };
        }
      }
    }
    return null;
  }

  extractAuthorInfo(actors: any): Author | null {
    if (actors && Array.isArray(actors) && actors.length > 0) {
      const author = actors[0];
      return {
        id: author.id,
        name: author.name,
        username: author.url ? author.url.split('/').pop() : null,
        profileUrl: author.url,
        type: author.__typename,
      };
    }
    return null;
  }

  extractPostContent(node: any): PostContent {
    let textContent = null;

    // Try multiple approaches to find text content
    if (node.comet_sections) {
      const sections = Array.isArray(node.comet_sections)
        ? node.comet_sections
        : [node.comet_sections];

      for (const section of sections) {
        if (section && typeof section === 'object') {
          if (section.message) {
            textContent = this.extractTextFromSection(section.message);
            if (textContent && !textContent.includes('Strategy')) break;
          }
          if (!textContent && section.content) {
            textContent = this.extractTextFromSection(section.content);
            if (textContent && !textContent.includes('Strategy')) break;
          }
          if (!textContent && section.story) {
            textContent = this.extractTextFromSection(section.story);
            if (textContent && !textContent.includes('Strategy')) break;
          }
        }
      }
    }

    if (!textContent && node.attachments) {
      textContent = this.extractTextFromAttachments(node.attachments);
    }

    if (!textContent || textContent.includes('Strategy')) {
      textContent = this.findTextContentRecursively(node);
    }

    // Filter out Facebook internal strings
    if (
      textContent &&
      (textContent.includes('Strategy') ||
        textContent.includes('Comet') ||
        textContent.includes('__typename') ||
        textContent.length < 3)
    ) {
      textContent = null;
    }

    return {
      text: textContent,
      hasText: !!textContent,
      type: (textContent ? 'text_post' : 'media_only') as
        | 'text_post'
        | 'media_only',
    };
  }

  extractTextFromSection(section: any): string | null {
    if (!section) return null;

    const findText = (obj: any): string | null => {
      if (typeof obj === 'string' && obj.length > 3) {
        return obj;
      }

      if (obj && typeof obj === 'object') {
        if (obj.text && typeof obj.text === 'string') {
          return obj.text;
        }

        for (const value of Object.values(obj)) {
          const found: string | null = findText(value);
          if (found) return found;
        }
      }
      return null;
    };

    return findText(section);
  }

  extractTextFromAttachments(attachments: any): string | null {
    if (!Array.isArray(attachments)) return null;

    for (const attachment of attachments) {
      if (attachment && attachment.description) {
        return attachment.description;
      }
      if (attachment && attachment.title) {
        return attachment.title;
      }

      const text = this.findTextContentRecursively(attachment);
      if (text && !text.includes('Strategy')) {
        return text;
      }
    }
    return null;
  }

  findTextContentRecursively(obj: any, depth: number = 0): string | null {
    if (depth > 4 || !obj || typeof obj !== 'object') return null;

    const textProps = [
      'text',
      'message',
      'description',
      'title',
      'content',
      'body',
    ];

    for (const prop of textProps) {
      if (
        obj[prop] &&
        typeof obj[prop] === 'string' &&
        obj[prop].length > 10 &&
        !obj[prop].includes('Strategy') &&
        !obj[prop].includes('Comet') &&
        !obj[prop].includes('__typename')
      ) {
        return obj[prop];
      }
    }

    if (obj.ranges && Array.isArray(obj.ranges)) {
      let fullText = '';
      for (const range of obj.ranges) {
        if (range.entity && range.entity.text) {
          fullText += range.entity.text;
        } else if (range.text) {
          fullText += range.text;
        }
      }
      if (fullText.length > 3) return fullText;
    }

    for (const [key, value] of Object.entries(obj)) {
      if (
        value &&
        typeof value === 'object' &&
        !key.includes('Strategy') &&
        !key.includes('__typename')
      ) {
        const result: string | null = this.findTextContentRecursively(
          value,
          depth + 1
        );
        if (result) return result;
      }
    }

    return null;
  }

  extractMediaInfo(node: any): MediaItem[] {
    const media: MediaItem[] = [];

    if (node.attachments && Array.isArray(node.attachments)) {
      node.attachments.forEach((attachment: any) => {
        this.searchForMediaInObject(attachment, media);
      });
    }

    if (node.comet_sections) {
      this.searchForMediaInObject(node.comet_sections, media);
    }

    return media;
  }

  searchForMediaInObject(obj: any, media: MediaItem[]): void {
    if (!obj || typeof obj !== 'object') return;

    if (obj.__typename === 'Photo' && obj.id) {
      media.push({
        type: 'photo',
        id: obj.id,
        url: obj.url || null,
      });
    }

    if (obj.image && obj.image.uri) {
      media.push({
        type: 'image',
        url: obj.image.uri,
        width: obj.image.width || null,
        height: obj.image.height || null,
      });
    }

    if (obj.video && obj.video.playable_url) {
      media.push({
        type: 'video',
        url: obj.video.playable_url,
        thumbnail: obj.video.preferred_thumbnail?.image?.uri || null,
      });
    }

    for (const value of Object.values(obj)) {
      if (value && typeof value === 'object') {
        this.searchForMediaInObject(value, media);
      }
    }
  }

  extractPrivacyInfo(node: any): Privacy | null {
    let privacy = null;

    if (node.privacy_scope && node.privacy_scope.privacy_scope_renderer) {
      const privacyData =
        node.privacy_scope.privacy_scope_renderer.privacy_row_input;
      if (privacyData) {
        privacy = {
          baseState: privacyData.base_state,
          allow: privacyData.allow || [],
          deny: privacyData.deny || [],
        };
      }
    }

    if (!privacy && node.comet_sections && node.comet_sections.metadata) {
      const metadataArray = Array.isArray(node.comet_sections.metadata)
        ? node.comet_sections.metadata
        : [node.comet_sections.metadata];

      for (const metadata of metadataArray) {
        if (
          metadata &&
          metadata.__typename === 'CometFeedStoryPrivacySelectorStrategy'
        ) {
          const privacyData =
            metadata.story?.privacy_scope?.privacy_scope_renderer
              ?.privacy_row_input;
          if (privacyData) {
            privacy = {
              baseState: privacyData.base_state,
              allow: privacyData.allow || [],
              deny: privacyData.deny || [],
            };
            break;
          }
        }
      }
    }

    return privacy;
  }

  // Get engagement data (comments, reactions, shares) for a post
  async getPostEngagement(
    feedbackId: string,
    fetchAllComments: boolean = true,
    fetchAllReactions: boolean = true,
    fetchAllShares: boolean = true
  ): Promise<PostEngagement> {
    // console.log(`Fetching engagement for post: ${feedbackId}`);

    const [commentsData, reactionsData, sharesData] = await Promise.all([
      this.getPostComments(feedbackId, fetchAllComments),
      fetchAllReactions
        ? this.getPostReactions(feedbackId, fetchAllReactions)
        : this.getBasicReactionCount(feedbackId),
      fetchAllShares
        ? this.getPostShares(feedbackId, fetchAllShares)
        : this.getBasicShareCount(feedbackId),
    ]);

    return {
      reactions: reactionsData || { total: 0, breakdown: {}, list: [] },
      comments: commentsData?.comments || { total: 0, list: [] },
      shares: sharesData || { total: 0, list: [] },
      pagination: {
        commentPagesLoaded: commentsData?.pagination?.pagesLoaded || 0,
        allCommentsLoaded: commentsData?.pagination?.allCommentsLoaded || false,
        reactionPagesLoaded: reactionsData?.pagination?.pagesLoaded || 0,
        allReactionsLoaded:
          reactionsData?.pagination?.allReactionsLoaded || false,
        sharePagesLoaded: sharesData?.pagination?.pagesLoaded || 0,
        allSharesLoaded: sharesData?.pagination?.allSharesLoaded || false,
      },
    };
  }

  // Get comments for a post
  async getPostComments(
    feedbackId: string,
    fetchAllComments: boolean = true
  ): Promise<{ comments: CommentData; pagination: PaginationInfo }> {
    let cursor = null;
    let hasNextPage = true;
    let pageCount = 0;
    let allComments: Comment[] = [];

    while (hasNextPage && (fetchAllComments || pageCount === 0)) {
      pageCount++;

      const variables = {
        feedbackID: feedbackId,
        after: cursor,
        before: null,
        first: null,
        last: null,
        includeHighlightedComments: false,
        includeNestedComments: true,
        isComet: true,
        isInitialFetch: pageCount === 1,
        isPaginating: pageCount > 1,
        topLevelViewOption: null,
        viewOption: null,
      };

      const bodyParams = {
        __a: '1',
        __req: this.requestCounter.toString(),
        __user: this.userId,
        doc_id: '4401540983249473',
        fb_dtsg: this.fbDtsg,
        variables: JSON.stringify(variables),
      };

      try {
        const response = await fetch('https://www.facebook.com/api/graphql/', {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded;charset=utf-8',
            cookie: this.cookies,
          },
          body: new URLSearchParams(bodyParams).toString(),
        });

        this.requestCounter++;
        const responseText = await response.text();
        const jsonData = JSON.parse(responseText);

        const pageData = this.parseCommentsPageData(jsonData, pageCount);
        if (pageData) {
          allComments.push(...pageData.comments.list);
          hasNextPage = pageData.pagination.hasNextPage;
          cursor = pageData.pagination.endCursor;
        }

        if (hasNextPage && fetchAllComments) {
          await this.delay(1500);
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        // console.error(
        //   `Error fetching comments page ${pageCount}:`,
        //   errorMessage
        // );
        break;
      }
    }

    return {
      comments: { total: allComments.length, list: allComments },
      pagination: { pagesLoaded: pageCount, allCommentsLoaded: !hasNextPage },
    };
  }

  parseCommentsPageData(
    response: any,
    pageNumber: number = 1
  ): {
    comments: { list: Comment[] };
    pagination: { hasNextPage: boolean; endCursor: string | null };
  } | null {
    try {
      if (
        response.data &&
        response.data.feedback &&
        response.data.feedback.display_comments
      ) {
        const displayComments = response.data.feedback.display_comments;

        const comments: Comment[] = (displayComments.edges || []).map(
          (edge: any, index: number): Comment => {
            const comment = edge.node || edge;
            return {
              id: comment.id || `comment_${pageNumber}_${index}`,
              author: {
                id: comment.author?.id,
                name: comment.author?.name || comment.author?.short_name,
                profileUrl: comment.author?.url,
                profilePicture: comment.author?.profile_picture?.uri,
              },
              text:
                comment.body?.text ||
                comment.message?.text ||
                comment.text ||
                '',
              timestamp: comment.created_time
                ? new Date(comment.created_time * 1000).toISOString()
                : null,
              likeCount:
                comment.feedback?.reaction_count?.count ||
                comment.like_count ||
                0,
              replyCount: comment.reply_count || 0,
            };
          }
        );

        return {
          comments: { list: comments },
          pagination: {
            hasNextPage: displayComments.page_info?.has_next_page || false,
            endCursor: displayComments.page_info?.end_cursor || null,
          },
        };
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      // console.error(`Error parsing comments page ${pageNumber}:`, errorMessage);
    }
    return null;
  }

  // Get reactions for a post
  async getPostReactions(
    feedbackId: string,
    fetchAllReactions: boolean = true
  ): Promise<ReactionData> {
    const allReactions: Reaction[] = [];
    const reactionBreakdown: { [key: string]: number } = {};
    let cursor = null;
    let hasNextPage = true;
    let pageCount = 0;

    while (hasNextPage && (fetchAllReactions || pageCount === 0)) {
      pageCount++;

      const variables = {
        count: 50,
        cursor: cursor,
        feedbackTargetID: feedbackId,
        id: feedbackId,
        reactionType: 'NONE',
        scale: 2,
      };

      const bodyParams = {
        __a: '1',
        __req: this.requestCounter.toString(),
        __user: this.userId,
        doc_id: '9515494628524128',
        fb_dtsg: this.fbDtsg,
        variables: JSON.stringify(variables),
      };

      try {
        const response = await fetch('https://www.facebook.com/api/graphql/', {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded;charset=utf-8',
            cookie: this.cookies,
          },
          body: new URLSearchParams(bodyParams).toString(),
        });

        this.requestCounter++;
        const responseText = await response.text();
        const jsonData = JSON.parse(responseText);

        const pageData = this.parseReactionsPageData(jsonData, pageCount);
        if (pageData) {
          allReactions.push(...pageData.reactions);
          pageData.reactions.forEach((reaction: Reaction) => {
            const type: string = reaction.reactionType || 'UNKNOWN';
            reactionBreakdown[type] = (reactionBreakdown[type] || 0) + 1;
          });

          hasNextPage = pageData.pagination.hasNextPage;
          cursor = pageData.pagination.endCursor;
        }

        if (hasNextPage && fetchAllReactions) {
          await this.delay(1000);
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        // console.error(
        //   `Error fetching reactions page ${pageCount}:`,
        //   errorMessage
        // );
        break;
      }
    }

    return {
      total: allReactions.length,
      breakdown: reactionBreakdown,
      list: allReactions,
      pagination: { pagesLoaded: pageCount, allReactionsLoaded: !hasNextPage },
    };
  }

  parseReactionsPageData(
    response: any,
    pageNumber: number = 1
  ): {
    reactions: Reaction[];
    pagination: { hasNextPage: boolean; endCursor: string | null };
  } | null {
    try {
      if (response.data && response.data.node && response.data.node.reactors) {
        const reactors = response.data.node.reactors;

        const reactions: Reaction[] = (reactors.edges || []).map(
          (edge: any, index: number): Reaction => {
            const reactionInfo = edge.feedback_reaction_info;
            const user = edge.node;

            return {
              id: reactionInfo?.id || `reaction_${pageNumber}_${index}`,
              reactionType: this.mapReactionType(reactionInfo?.id),
              user: {
                id: user?.id,
                name: user?.name,
                profileUrl: user?.url,
                profilePicture: reactionInfo?.face_image?.uri,
              },
            };
          }
        );

        return {
          reactions: reactions,
          pagination: {
            hasNextPage: reactors.page_info?.has_next_page || false,
            endCursor: reactors.page_info?.end_cursor || null,
          },
        };
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `Error parsing reactions page ${pageNumber}:`,
        errorMessage
      );
    }
    return null;
  }

  mapReactionType(reactionId: string): string {
    const reactionMap: { [key: string]: string } = {
      '1635855486666999': 'LIKE',
      '1678524932434102': 'LOVE',
      '115940658764963': 'WOW',
      '478547315650144': 'HAHA',
      '613557422527858': 'ANGRY',
      '310221169069506': 'CARE',
      '908563776549649': 'SAD',
    };
    return reactionMap[reactionId] || 'UNKNOWN';
  }

  // Get shares for a post
  async getPostShares(
    feedbackId: string,
    fetchAllShares: boolean = true
  ): Promise<ShareData> {
    const allShares: Share[] = [];
    let cursor = null;
    let hasNextPage = true;
    let pageCount = 0;

    while (hasNextPage && (fetchAllShares || pageCount === 0)) {
      pageCount++;

      const variables: any = {
        feedbackID: feedbackId,
        feedbackSource: 1,
        feedLocation: 'SHARE_OVERLAY',
        privacySelectorRenderLocation: 'COMET_STREAM',
        renderLocation: 'reshares_dialog',
        scale: 2,
        UFI2CommentsProvider_commentsKey: 'CometResharesDialogQuery',
      };

      if (pageCount > 1 && cursor) {
        variables.after = cursor;
        variables.first = 50;
      }

      const bodyParams = {
        __a: '1',
        __req: this.requestCounter.toString(),
        __user: this.userId,
        doc_id: '3240549509368620',
        fb_dtsg: this.fbDtsg,
        variables: JSON.stringify(variables),
      };

      try {
        const response = await fetch('https://www.facebook.com/api/graphql/', {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded;charset=utf-8',
            cookie: this.cookies,
          },
          body: new URLSearchParams(bodyParams).toString(),
        });

        this.requestCounter++;
        const responseText = await response.text();
        const jsonData = JSON.parse(responseText);

        const pageData = this.parseSharesPageData(jsonData, pageCount);
        if (pageData) {
          allShares.push(...pageData.shares);
          hasNextPage = pageData.pagination.hasNextPage;
          cursor = pageData.pagination.endCursor;
        }

        if (hasNextPage && fetchAllShares) {
          await this.delay(1000);
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error fetching shares page ${pageCount}:`, errorMessage);
        break;
      }
    }

    return {
      total: allShares.length,
      list: allShares,
      pagination: { pagesLoaded: pageCount, allSharesLoaded: !hasNextPage },
    };
  }

  parseSharesPageData(
    response: any,
    pageNumber: number = 1
  ): {
    shares: Share[];
    pagination: { hasNextPage: boolean; endCursor: string | null };
  } | null {
    try {
      if (response.data && response.data.feedback) {
        const feedback = response.data.feedback;
        let sharesList = null;

        if (feedback.reshares && feedback.reshares.edges) {
          sharesList = feedback.reshares.edges;
        } else if (feedback.shares && feedback.shares.edges) {
          sharesList = feedback.shares.edges;
        } else if (
          feedback.share_attachment &&
          feedback.share_attachment.all_shares_aggregate_story &&
          feedback.share_attachment.all_shares_aggregate_story.edges
        ) {
          sharesList =
            feedback.share_attachment.all_shares_aggregate_story.edges;
        }

        if (sharesList && Array.isArray(sharesList)) {
          const shares = sharesList.map((edge, index) => {
            const share = edge.node || edge;
            let user = null;

            if (
              share.attached_story &&
              share.attached_story.comet_sections &&
              share.attached_story.comet_sections.context_layout
            ) {
              const contextLayout =
                share.attached_story.comet_sections.context_layout;
              if (contextLayout.story && contextLayout.story.actors) {
                user = contextLayout.story.actors[0];
              }
            }

            if (!user) {
              user = share.actor || share.author || share.owner;
            }

            let messageText = '';
            if (
              share.attached_story &&
              share.attached_story.comet_sections &&
              share.attached_story.comet_sections.content
            ) {
              const content = share.attached_story.comet_sections.content;
              if (content.story && content.story.message) {
                messageText = content.story.message.text || '';
              }
            }

            if (!messageText) {
              messageText = share.message?.text || share.text || '';
            }

            return {
              id: share.id || `share_${pageNumber}_${index}`,
              user: {
                id: user?.id,
                name: user?.name || user?.short_name,
                profileUrl: user?.url,
                profilePicture: user?.profile_picture?.uri,
              },
              text: messageText,
              timestamp: share.created_time
                ? new Date(share.created_time * 1000).toISOString()
                : null,
              shareType: share.__typename || 'reshare',
            };
          });

          let pageInfo = null;
          if (feedback.reshares && feedback.reshares.page_info) {
            pageInfo = feedback.reshares.page_info;
          } else if (feedback.shares && feedback.shares.page_info) {
            pageInfo = feedback.shares.page_info;
          } else if (
            feedback.share_attachment &&
            feedback.share_attachment.all_shares_aggregate_story &&
            feedback.share_attachment.all_shares_aggregate_story.page_info
          ) {
            pageInfo =
              feedback.share_attachment.all_shares_aggregate_story.page_info;
          }

          return {
            shares: shares,
            pagination: {
              hasNextPage: pageInfo?.has_next_page || false,
              endCursor: pageInfo?.end_cursor || null,
            },
          };
        }
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error parsing shares page ${pageNumber}:`, errorMessage);
    }
    return null;
  }

  async getBasicReactionCount(feedbackId: string): Promise<ReactionData> {
    const reactionsData = await this.getPostReactions(feedbackId, false);
    if (reactionsData) {
      return {
        total: reactionsData.total,
        breakdown: reactionsData.breakdown,
        list: [],
        pagination: reactionsData.pagination,
      };
    }
    return {
      total: 0,
      breakdown: {},
      list: [],
      pagination: { pagesLoaded: 0, allReactionsLoaded: false },
    };
  }

  async getBasicShareCount(feedbackId: string): Promise<ShareData> {
    try {
      const sharesData = await this.getPostShares(feedbackId, false);
      if (sharesData && sharesData.total > 0) {
        return {
          total: sharesData.total,
          list: [],
          pagination: sharesData.pagination,
        };
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.log(`Could not fetch share count: ${errorMessage}`);
    }
    return {
      total: 0,
      list: [],
      pagination: { pagesLoaded: 0, allSharesLoaded: true },
    };
  }

  // Enhanced function to get posts with engagement data
  async getPostsWithEngagement(
    cursor: string | null = null,
    count: number = 10,
    profileId: string | null = null,
    includeEngagement: boolean = true,
    fetchAllComments: boolean = true,
    fetchAllReactions: boolean = true,
    fetchAllShares: boolean = true
  ): Promise<Post[]> {
    const postsResponse = await this.getPosts(cursor, count, profileId);
    const parseResult = this.parsePostsData(postsResponse);
    const posts = parseResult.posts;

    if (!includeEngagement || posts.length === 0) {
      return posts;
    }

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      const postEdge =
        postsResponse.data?.node?.timeline_list_feed_units?.edges?.[i];
      const feedbackId = postEdge?.node?.feedback?.id;

      if (feedbackId) {
        // console.log(
        //   `Fetching engagement for post ${i + 1}/${
        //     posts.length
        //   } (ID: ${feedbackId})`
        // );

        const engagement = await this.getPostEngagement(
          feedbackId,
          fetchAllComments,
          fetchAllReactions,
          fetchAllShares
        );
        if (engagement) {
          post.engagement = engagement;
          // console.log(
          //   `Added engagement to post ${i + 1}: ${
          //     engagement.reactions.total
          //   } reactions, ${engagement.comments.total} comments, ${
          //     engagement.shares.total
          //   } shares`
          // );
        } else {
          post.engagement = {
            reactions: { total: 0, breakdown: {}, list: [] },
            comments: { total: 0, list: [] },
            shares: { total: 0, list: [] },
            pagination: {
              commentPagesLoaded: 0,
              allCommentsLoaded: false,
              reactionPagesLoaded: 0,
              allReactionsLoaded: false,
              sharePagesLoaded: 0,
              allSharesLoaded: false,
            },
          };
        }

        if (i < posts.length - 1) {
          const delayTime = 3000; // 3 second delay between posts
          // console.log(`Waiting ${delayTime / 1000}s before next post...`);
          await this.delay(delayTime);
        }
      } else {
        // console.log(`No feedback ID found for post ${i + 1}`);
        post.engagement = {
          reactions: { total: 0, breakdown: {}, list: [] },
          comments: { total: 0, list: [] },
          shares: { total: 0, list: [] },
          pagination: {
            commentPagesLoaded: 0,
            allCommentsLoaded: false,
            reactionPagesLoaded: 0,
            allReactionsLoaded: false,
            sharePagesLoaded: 0,
            allSharesLoaded: false,
          },
        };
      }
    }

    return posts;
  }

  delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// MAIN FUNCTION: Get ALL posts with engagement (reactions, comments, shares)
async function getAllPostsWithEngagement(
  profileId: string | null = null,
  includeEngagement: boolean = true,
  postLimit: number = 100
): Promise<Post[]> {
  try {
    // console.log(
    //   `Starting to fetch posts with engagement data (limit: ${postLimit})...`
    // );
    // console.log(
    //   `This will include: reactions, comments, and shares for each post`
    // );
    // console.log(
    //   `This may take several minutes depending on your post count and engagement levels`
    // );

    const sessionData = autoExtractSessionData();

    if (!sessionData.cookies || !sessionData.userId || !sessionData.fbDtsg) {
      console.error('Missing required session data.');
      console.log(
        'Make sure you are logged into Facebook and on a Facebook page.'
      );
      return [];
    }

    if (profileId) {
      sessionData.profileId = profileId;
    }

    // Convert ExtractedSessionData to PostSessionData
    const postSessionData: PostSessionData = {
      cookies: sessionData.cookies,
      userId: sessionData.userId as string, // We validated it's not null above
      fbDtsg: sessionData.fbDtsg as string, // We validated it's not null above
      collectionId: sessionData.collectionId,
      jazoest: sessionData.jazoest || undefined,
      lsd: sessionData.lsd || undefined,
      profileId: sessionData.profileId || undefined,
    };

    const api = new FacebookPostsAPI(postSessionData);

    // Send initial progress message
    chrome.runtime.sendMessage({
      type: 'ENGAGEMENT_COLLECTION_PROGRESS',
      collected: 0,
    });

    let allPosts = [];
    let cursor = null;
    let hasNextPage = true;
    let pageCount = 0;
    let totalFetched = 0;

    while (hasNextPage && totalFetched < postLimit) {
      pageCount++;
      console.log(
        `📄 Fetching page ${pageCount}${cursor ? ` (cursor: ${cursor.substring(0, 20)}...)` : ''
        }... (${totalFetched}/${postLimit} posts)`
      );

      try {
        let posts;
        let pagination = null;

        if (includeEngagement) {
          // Get posts with full engagement data (reactions, comments, shares)
          posts = await api.getPostsWithEngagement(
            cursor,
            10,
            profileId,
            true,
            true,
            true,
            true
          );
        } else {
          // Get posts without engagement for faster processing
          const response = await api.getPosts(cursor, 50, profileId);
          const parseResult = api.parsePostsData(response);
          posts = parseResult.posts;
          pagination = parseResult.pagination;
        }

        if (!posts || posts.length === 0) {
          // console.log('No more posts found. Reached end of timeline.');
          break;
        }

        // Limit posts to not exceed the postLimit
        const remainingSlots = postLimit - totalFetched;
        if (posts.length > remainingSlots) {
          posts = posts.slice(0, remainingSlots);
          // console.log(`Trimmed posts to respect limit of ${postLimit}`);
        }

        allPosts.push(...posts);
        totalFetched += posts.length;

        // Send progress update to extension popup
        chrome.runtime.sendMessage({
          type: 'ENGAGEMENT_COLLECTION_PROGRESS',
          collected: totalFetched,
        });

        // console.log(
        //   `Page ${pageCount}: Got ${posts.length} posts. Total: ${totalFetched}/${postLimit} posts`
        // );

        // Check if we've reached the limit
        if (totalFetched >= postLimit) {
          // console.log(
          //   `Reached post limit of ${postLimit}. Stopping collection.`
          // );
          break;
        }

        // Extract pagination info
        if (pagination) {
          cursor = pagination.endCursor;
          hasNextPage =
            pagination.hasNextPage !== undefined
              ? pagination.hasNextPage
              : Boolean(cursor && posts.length > 0);
        } else {
          const lastPost: Post | undefined = posts[posts.length - 1];
          cursor = lastPost?.cursor;
          hasNextPage = Boolean(posts.length > 0 && cursor);
        }

        if (!cursor) {
          // console.log(
          //   'No cursor available. Reached end of available posts.'
          // );
          break;
        }

        // Add delay to avoid rate limiting
        const delayTime = includeEngagement ? 3000 : 2000; // Longer delay for engagement
        // console.log(
        //   `Waiting ${delayTime / 1000} seconds to avoid rate limiting...`
        // );
        await api.delay(delayTime);

        // Safety limit
        if (pageCount >= 100) {
          // console.log(
          //   `Reached safety limit of 100 pages (${totalFetched} posts). Stopping.`
          // );
          break;
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error on page ${pageCount}:`, errorMessage);
        // console.log(
        //   `Successfully fetched ${totalFetched} posts before error.`
        // );
        break;
      }
    }

    // console.log(
    //   `Finished! Successfully fetched ${totalFetched} posts (limit was ${postLimit}) across ${pageCount} pages.`
    // );

    // Send completion message
    chrome.runtime.sendMessage({
      type: 'ENGAGEMENT_COLLECTION_COMPLETED',
      totalCount: totalFetched,
    });

    if (includeEngagement && allPosts.length > 0) {
      const totalReactions = allPosts.reduce(
        (sum, post) => sum + (post.engagement?.reactions?.total || 0),
        0
      );
      const totalComments = allPosts.reduce(
        (sum, post) => sum + (post.engagement?.comments?.total || 0),
        0
      );
      const totalShares = allPosts.reduce(
        (sum, post) => sum + (post.engagement?.shares?.total || 0),
        0
      );

      // console.log(`Engagement Summary:`);
      // console.log(`${totalReactions} total reactions`);
      // console.log(`${totalComments} total comments`);
      // console.log(`${totalShares} total shares`);
    }

    // Store data globally
    window.allFacebookPostsWithEngagement = allPosts;

    // Create download function
    const dataStr = JSON.stringify(allPosts, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    window.downloadPostsData = function () {
      const a = document.createElement('a');
      a.href = url;
      a.download = `facebook_posts_with_engagement_${sessionData.profileId}_${new Date().toISOString().split('T')[0]
        }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // console.log('Downloaded posts with engagement data as JSON file!');
    };

    // console.log('To download data as JSON file, run: downloadPostsData()');
    // console.log('Data stored in: window.allFacebookPostsWithEngagement');

    return allPosts;
  } catch (error) {
    console.error('Error in getAllPostsWithEngagement:', error);
    throw error;
  }
}

// Make functions available globally
(window as any).FacebookPostsAPI = FacebookPostsAPI;
(window as any).getAllPostsWithEngagement = getAllPostsWithEngagement;
