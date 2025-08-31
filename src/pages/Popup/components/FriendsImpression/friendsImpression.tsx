import React, { useState, useEffect } from 'react';
import './friendsImpression.css';
import {
  FaThumbsUp,
  FaCommentAlt,
  FaShareAlt,
  FaPlay,
  FaStop,
  FaDownload,
  FaTrash,
  FaSync,
  FaChartBar,
} from 'react-icons/fa';
import { BiLike } from 'react-icons/bi';
import { MdOutlineComment } from 'react-icons/md';
import { FiShare2 } from 'react-icons/fi';
import Swal from 'sweetalert2';

interface FriendsInteractionData {
  friendId: string;
  name: string;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  lastUpdated: number;
}

interface FriendsDataStats {
  totalFriends: number;
  totalInteractions: number;
  lastUpdateTime: number;
  dataCollectionActive: boolean;
}

interface FriendWithEngagement {
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
    engagementScore: number;
  };
}

interface EngagementSummary {
  totalFriends: number;
  engagedFriends: number;
  engagementRate: string;
  totalReactions: number;
  totalComments: number;
  totalShares: number;
  totalEngagements: number;
  avgEngagementPerFriend: string;
  topEngagers: Array<{
    name: string;
    score: number;
    reactions: number;
    comments: number;
    shares: number;
  }>;
  reactionTypeBreakdown: { [key: string]: number };
}

const PAGE_SIZE = 8;

function FriendsImpression() {
  // UI mode: 'friends' or 'engagement'
  const [uiMode, setUiMode] = useState<'friends' | 'engagement'>('friends');
  const [currentPage, setCurrentPage] = useState(1);
  const [friendsData, setFriendsData] = useState<FriendsInteractionData[]>([]);
  const [mergedEngagementData, setMergedEngagementData] = useState<
    FriendWithEngagement[]
  >([]);
  const [engagementSummary, setEngagementSummary] =
    useState<EngagementSummary | null>(null);
  const [viewMode, setViewMode] = useState<'active' | 'inactive'>('active');
  const [stats, setStats] = useState<FriendsDataStats>({
    totalFriends: 0,
    totalInteractions: 0,
    lastUpdateTime: 0,
    dataCollectionActive: false,
  });
  useEffect(() => {
    console.log(friendsData);
  }, []);
  // Persist loading state in storage
  const [loading, setLoading] = useState(false);
  // Engagement loading/counter state
  const [engagementLoading, setEngagementLoading] = useState(false);
  const [engagementCollectingCount, setEngagementCollectingCount] = useState(0);
  // Toggle for action buttons in engagement view
  const [showActionButtons, setShowActionButtons] = useState(false);
  // Post limit popup state
  const [showPostLimitPopup, setShowPostLimitPopup] = useState(false);
  const [postLimit, setPostLimit] = useState<number>(10);
  // Selected friends for deletion
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(
    new Set()
  );
  // Unfriend operation state
  const [unfriendInProgress, setUnfriendInProgress] = useState(false);
  const [unfriendProgress, setUnfriendProgress] = useState({
    completed: 0,
    total: 0,
    current: '',
    percentage: 0,
  });
  // Track if friends data has been collected at least once in this session
  const [friendsDataCollected, setFriendsDataCollected] = useState(false);
  // Counter for friends being collected
  const [collectingCount, setCollectingCount] = useState(0);


  // Split friendsData into active and inactive
  const activeFriends = friendsData.filter(
    (f) => f.totalLikes > 0 || f.totalComments > 0 || f.totalShares > 0
  );
  const inactiveFriends = friendsData.filter(
    (f) => f.totalLikes === 0 && f.totalComments === 0 && f.totalShares === 0
  );

  // Fact API state
  const [fact, setFact] = useState<string>("");
  const [factLoading, setFactLoading] = useState<boolean>(false);
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (engagementLoading) {
      const fetchFact = async () => {
        setFactLoading(true);
        try {
          const response = await fetch("https://api.api-ninjas.com/v1/facts", {
            method: "GET",
            headers: {
              "X-Api-Key": "bWWjBgMAnqD48Cedk2qrIQ==ToBNTn8SqqlRtXAL"
            }
          });
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data) && data.length > 0 && data[0].fact) {
              setFact(data[0].fact);
            } else if (typeof data === "object" && data.fact) {
              setFact(data.fact);
            } else {
              setFact("No fact found.");
            }
          } else {
            setFact("Error fetching fact.");
          }
        } catch (err) {
          setFact("Error fetching fact.");
        }
        setFactLoading(false);
      };
      fetchFact();
      interval = setInterval(fetchFact, 180000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [engagementLoading]);

  const TOTAL_PAGES =
    viewMode === 'active'
      ? Math.ceil(activeFriends.length / PAGE_SIZE)
      : Math.ceil(inactiveFriends.length / PAGE_SIZE);
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const friendsPageData =
    viewMode === 'active'
      ? activeFriends.slice(startIdx, startIdx + PAGE_SIZE)
      : inactiveFriends.slice(startIdx, startIdx + PAGE_SIZE);

  useEffect(() => {
    // On mount, restore loading/collecting state from storage
    (async () => {
      const result = await chrome.storage.local.get([
        'popupLoading',
        'popupCollectingCount',
        'engagementLoading',
        'engagementCollectingCount',
      ]);
      if (typeof result.popupLoading === 'boolean')
        setLoading(result.popupLoading);
      if (typeof result.popupCollectingCount === 'number')
        setCollectingCount(result.popupCollectingCount);
      if (typeof result.engagementLoading === 'boolean')
        setEngagementLoading(result.engagementLoading);
      if (typeof result.engagementCollectingCount === 'number')
        setEngagementCollectingCount(result.engagementCollectingCount);
    })();

    // Set up periodic sync of collecting count from storage
    const syncInterval = setInterval(async () => {
      try {
        const result = await chrome.storage.local.get([
          'popupCollectingCount',
          'popupLoading',
        ]);
        if (typeof result.popupCollectingCount === 'number') {
          setCollectingCount(result.popupCollectingCount);
        }
        if (typeof result.popupLoading === 'boolean') {
          setLoading(result.popupLoading);
        }
      } catch (error) {
        // console.error('Error syncing collecting count:', error);
      }
    }, 500); // Check every 500ms

    loadFriendsData();
    loadStats();

    // Listen for unfriend progress messages, friends and engagement collection progress
    const handleMessage = (message: any) => {
      if (message.type === 'UNFRIEND_PROGRESS') {
        setUnfriendProgress({
          completed: message.completed,
          total: message.total,
          current: message.current?.friendName || 'Unknown',
          percentage: message.percentage,
        });
      } else if (message.type === 'UNFRIEND_COMPLETED') {
        setUnfriendInProgress(false);
        setSelectedFriends(new Set()); // Clear selections
        // ...existing code...
      } else if (message.type === 'UNFRIEND_ERROR') {
        setUnfriendInProgress(false);
        Swal.fire({
          icon: 'error',
          title: 'Unfriend Operation Failed',
          text:
            message.error ||
            'An unknown error occurred during the unfriend operation.',
          confirmButtonColor: '#19c37d',
        });
      } else if (message.type === 'FRIENDS_COLLECTION_PROGRESS') {
        // Listen for progress from content script
        // console.log('Friends collection progress:', message.collected);
        setCollectingCount(message.collected || 0);
        chrome.storage.local.set({
          popupCollectingCount: message.collected || 0,
        });
      } else if (message.type === 'FRIENDS_COLLECTION_COMPLETED') {
        // console.log('Friends collection completed:', message);
        setLoading(false);
        setCollectingCount(0);
        setStats((prev) => ({ ...prev, dataCollectionActive: false }));
        chrome.storage.local.set({
          popupLoading: false,
          popupCollectingCount: 0,
        });

        // Handle collected data if provided
        if (message.data && Array.isArray(message.data)) {
          const convertedData: FriendsInteractionData[] = message.data.map(
            (friend: any) => ({
              friendId: friend.id || '',
              name: friend.name || 'Unknown',
              totalLikes: 0,
              totalComments: 0,
              totalShares: 0,
              lastUpdated: Date.now(),
            })
          );
          setFriendsData(convertedData);
          setFriendsDataCollected(true);

          const updatedStats = recalculateStats(convertedData);
          setStats(updatedStats);

          // Save data asynchronously without blocking
          saveToStorage({
            friendsData: convertedData,
            stats: updatedStats,
          })
            .then(() => {
              // console.log(
              //   `Saved ${convertedData.length} friends to storage`
              // );
            })
            .catch((error) => {
              // console.error('Error saving data:', error);
            });
        }
      } else if (message.type === 'ENGAGEMENT_COLLECTION_PROGRESS') {
        setEngagementCollectingCount(message.collected || 0);
        chrome.storage.local.set({
          engagementCollectingCount: message.collected || 0,
        });
      } else if (message.type === 'ENGAGEMENT_COLLECTION_COMPLETED') {
        setEngagementLoading(false);
        setEngagementCollectingCount(0);
        chrome.storage.local.set({
          engagementLoading: false,
          engagementCollectingCount: 0,
        });
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
      clearInterval(syncInterval);
    };
  }, []);

  // Recalculate stats whenever friendsData changes
  useEffect(() => {
    if (friendsData.length > 0) {
      const totalInteractions = friendsData.reduce(
        (sum, friend) =>
          sum + friend.totalLikes + friend.totalComments + friend.totalShares,
        0
      );

      setStats((prevStats) => ({
        ...prevStats,
        totalFriends: friendsData.length,
        totalInteractions: totalInteractions,
      }));
    }
  }, [friendsData]);

  const loadFriendsData = async () => {
    try {
      const result = await chrome.storage.local.get([
        'friendsData',
        'mergedEngagementData',
        'engagementSummary',
      ]);

      if (result.friendsData && Array.isArray(result.friendsData)) {
        setFriendsData(result.friendsData);
        if (result.friendsData.length > 0) {
          setFriendsDataCollected(true);
        }

        // Calculate total interactions from loaded data
        const totalInteractions = result.friendsData.reduce(
          (sum: number, friend: FriendsInteractionData) =>
            sum + friend.totalLikes + friend.totalComments + friend.totalShares,
          0
        );

        // Update stats if we have interaction data but stats don't reflect it
        setStats((prevStats) => ({
          ...prevStats,
          totalFriends: result.friendsData.length,
          totalInteractions: totalInteractions,
        }));

        // console.log(
        //   `Loaded ${result.friendsData.length} friends from storage with ${totalInteractions} total interactions`
        // );
      }

      if (
        result.mergedEngagementData &&
        Array.isArray(result.mergedEngagementData)
      ) {
        setMergedEngagementData(result.mergedEngagementData);
        // console.log(
        //   `Loaded ${result.mergedEngagementData.length} engagement records from storage`
        // );
      }

      if (result.engagementSummary) {
        setEngagementSummary(result.engagementSummary);
        // console.log('Loaded engagement summary from storage');
      }
    } catch (error) {
      // console.error('Error loading friends data from storage:', error);
    }
  };

  const loadStats = async () => {
    try {
      const result = await chrome.storage.local.get([
        'friendsStats',
        'uiMode',
        'viewMode',
      ]);

      if (result.friendsStats) {
        setStats(result.friendsStats);
        // console.log('Loaded stats from storage:', result.friendsStats);
      }

      if (result.uiMode) {
        setUiMode(result.uiMode);
        // console.log('Loaded UI mode from storage:', result.uiMode);
      }

      if (result.viewMode) {
        setViewMode(result.viewMode);
        // console.log('Loaded view mode from storage:', result.viewMode);
      }
    } catch (error) {
      // console.error('Error loading stats from storage:', error);
    }
  };

  // Helper function to recalculate stats from friends data
  const recalculateStats = (friendsData: FriendsInteractionData[]) => {
    const totalInteractions = friendsData.reduce(
      (sum, friend) =>
        sum + friend.totalLikes + friend.totalComments + friend.totalShares,
      0
    );

    return {
      totalFriends: friendsData.length,
      totalInteractions: totalInteractions,
      lastUpdateTime: Date.now(),
      dataCollectionActive: false,
    };
  };

  // Save data to Chrome storage
  const saveToStorage = async (data: {
    friendsData?: FriendsInteractionData[];
    stats?: typeof stats;
    mergedEngagementData?: FriendWithEngagement[];
    engagementSummary?: any;
    uiMode?: 'friends' | 'engagement';
    viewMode?: 'active' | 'inactive';
  }) => {
    try {
      const storageData: any = {};

      if (data.friendsData !== undefined) {
        storageData.friendsData = data.friendsData;
      }

      if (data.stats !== undefined) {
        storageData.friendsStats = data.stats;
      }

      if (data.mergedEngagementData !== undefined) {
        storageData.mergedEngagementData = data.mergedEngagementData;
      }

      if (data.engagementSummary !== undefined) {
        storageData.engagementSummary = data.engagementSummary;
      }

      if (data.uiMode !== undefined) {
        storageData.uiMode = data.uiMode;
      }

      if (data.viewMode !== undefined) {
        storageData.viewMode = data.viewMode;
      }

      await chrome.storage.local.set(storageData);
    } catch (error) {}
  };

  const handleStartCollection = async () => {
    setUiMode('friends');
    await saveToStorage({ uiMode: 'friends' });
    setLoading(true);
    setCollectingCount(0);
    chrome.storage.local.set({ popupLoading: true, popupCollectingCount: 0 });
    setStats((prev) => ({ ...prev, dataCollectionActive: true }));

    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab.id) {
        setLoading(false);
        setStats((prev) => ({ ...prev, dataCollectionActive: false }));
        chrome.storage.local.set({
          popupLoading: false,
          popupCollectingCount: 0,
        });
        return;
      }
      console.log(`Active tab found: ${tab.id}`);

      // Check if we're on Facebook
      if (!tab.url?.includes('facebook') || !tab.url?.includes('friends')) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid Tab',
          text: 'Please navigate to the Facebook Friends page.',
        });
        // console.log(`Invalid tab URL: ${tab.url}`);
        setLoading(false);
        setStats((prev) => ({ ...prev, dataCollectionActive: false }));
        chrome.storage.local.set({
          popupLoading: false,
          popupCollectingCount: 0,
        });
        return;
      }

      // Send message directly to start friends data collection without reload
      console.log('Starting friends data collection...');
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'START_FRIENDS_DATA_COLLECTION',
      });

      if (response && response.success) {
        // console.log('Collection started successfully');
      } else {
        // console.error('Collection failed to start:', response?.error);
        setLoading(false);
        setStats((prev) => ({ ...prev, dataCollectionActive: false }));
        setCollectingCount(0);
        chrome.storage.local.set({
          popupLoading: false,
          popupCollectingCount: 0,
        });

        Swal.fire({
          icon: 'error',
          title: 'Collection Failed',
          text:
            response?.error || 'Failed to start collection. Please try again.',
        });
      }
    } catch (error) {
      // console.error('Error starting collection:', error);
      setLoading(false);
      setStats((prev) => ({ ...prev, dataCollectionActive: false }));
      setCollectingCount(0);
      chrome.storage.local.set({
        popupLoading: false,
        popupCollectingCount: 0,
      });

      Swal.fire({
        icon: 'error',
        title: 'Connection Error',
        text: 'Could not communicate with the page. Please refresh and try again.',
      });
    }
  };

  const handleStopCollection = async () => {
    setStats((prev) => ({
      ...prev,
      dataCollectionActive: false,
    }));
  };

  const handleExportData = async () => {
    if (friendsData.length === 0) {
      return;
    }

    try {
      // Prepare CSV header
      const headers = [
        'friendId',
        'name',
        'totalLikes',
        'totalComments',
        'totalShares',
        'lastUpdated',
      ];
      const csvRows = [headers.join(',')];

      // Prepare CSV rows
      friendsData.forEach((friend) => {
        const row = [
          friend.friendId,
          '"' + (friend.name ? friend.name.replace(/"/g, '""') : '') + '"',
          friend.totalLikes,
          friend.totalComments,
          friend.totalShares,
          friend.lastUpdated,
        ];
        csvRows.push(row.join(','));
      });

      const csvContent = csvRows.join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `facebook_friends_data_${
        new Date().toISOString().split('T')[0]
      }.csv`;
      a.click();

      URL.revokeObjectURL(url);
    } catch (error) {}
  };

  const handleClearData = async () => {
    if (friendsData.length === 0) return;

    const clearedStats = {
      totalFriends: 0,
      totalInteractions: 0,
      lastUpdateTime: 0,
      dataCollectionActive: false,
    };

    setFriendsData([]);
    setStats(clearedStats);
    setMergedEngagementData([]);
    setEngagementSummary(null);
    setCurrentPage(1);
    setFriendsDataCollected(false); // Disable engagement button after clearing data
    setLoading(false);
    setCollectingCount(0);
    chrome.storage.local.set({ popupLoading: false, popupCollectingCount: 0 });

    // Clear data from storage
    await saveToStorage({
      friendsData: [],
      stats: clearedStats,
      mergedEngagementData: [],
      engagementSummary: null,
    });

    // console.log('All friends data and interaction counts cleared');
  };

  const handlePostApi = async () => {
    setShowPostLimitPopup(true);
  };

  const handleStartPostsCollection = async () => {
    setShowPostLimitPopup(false);
    setUiMode('engagement');
    await saveToStorage({ uiMode: 'engagement' });
    setEngagementLoading(true);
    setEngagementCollectingCount(0);
    chrome.storage.local.set({
      engagementLoading: true,
      engagementCollectingCount: 0,
    });

    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab.id) {
        return;
      }

      // Check if we're on Facebook
      if (!tab.url?.includes('facebook.com')) {
        Swal.fire({
          icon: 'error',
          title: 'Navigation Error',
          text: 'Please navigate to the Facebook Posts page first.',
        });
        return;
      }

      // Send message to content script to start posts engagement collection with limit
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'START_POSTS_ENGAGEMENT_COLLECTION',
        profileId: null, // You can modify this to pass a specific profile ID if needed
        postLimit: postLimit,
      });

      if (response.success) {
        // Handle merged engagement data if available
        if (response.mergedFriendsData && response.engagementSummary) {
          setMergedEngagementData(response.mergedFriendsData);
          setEngagementSummary(response.engagementSummary);

          // Update friendsData with engagement values
          const updatedFriendsData = friendsData.map((friend) => {
            const engagementMap = new Map();
            response.mergedFriendsData.forEach((f: FriendWithEngagement) => {
              engagementMap.set(f.id, f.engagement);
            });

            const engagement = engagementMap.get(friend.friendId);
            if (engagement) {
              return {
                ...friend,
                totalLikes: engagement.totalReactions,
                totalComments: engagement.totalComments,
                totalShares: engagement.totalShares,
                lastUpdated: Date.now(),
              };
            }
            return friend;
          });

          setFriendsData(updatedFriendsData);

          const updatedStats = recalculateStats(updatedFriendsData);
          setStats(updatedStats);

          // Save all data to storage
          await saveToStorage({
            friendsData: updatedFriendsData,
            stats: updatedStats,
            mergedEngagementData: response.mergedFriendsData,
            engagementSummary: response.engagementSummary,
          });

          setViewMode('active'); // Switch to active friends view after engagement collection
          await saveToStorage({ viewMode: 'active' });
        } else {
          console.log('heh');
        }
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Collection Error',
          text: `Collection failed: ${response.error}`,
        });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Collection Error',
        text: 'Error starting collection. Please try again.',
      });
    } finally {
      setEngagementLoading(false);
      setEngagementCollectingCount(0);
      chrome.storage.local.set({
        engagementLoading: false,
        engagementCollectingCount: 0,
      });
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= TOTAL_PAGES) setCurrentPage(page);
  };

  // Checkbox handlers
  const handleSelectFriend = (friendId: string, checked: boolean) => {
    const newSelected = new Set(selectedFriends);
    if (checked) {
      newSelected.add(friendId);
    } else {
      newSelected.delete(friendId);
    }
    setSelectedFriends(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = friendsPageData.map((f) => f.friendId);
      const newSelected = new Set(selectedFriends);
      allIds.forEach((id) => newSelected.add(id));
      setSelectedFriends(newSelected);
    } else {
      const pageIds = new Set(friendsPageData.map((f) => f.friendId));
      const newSelected = new Set<string>();
      selectedFriends.forEach((id) => {
        if (!pageIds.has(id)) {
          newSelected.add(id);
        }
      });
      setSelectedFriends(newSelected);
    }
  };

  // Delete handlers
  const handleDeleteSelected = async () => {
    if (selectedFriends.size === 0) {
      Swal.fire({
        icon: 'info',
        title: 'No Friends Selected',
        text: 'Please select friends to unfriend.',
      });
      return;
    }

    const selectedFriendsData = friendsData.filter((f) =>
      selectedFriends.has(f.friendId)
    );

    setUnfriendInProgress(true);
    setUnfriendProgress({
      completed: 0,
      total: selectedFriends.size,
      current: '',
      percentage: 0,
    });

    // Immediately remove selected friends from popup
    setFriendsData((prev) =>
      prev.filter((f) => !selectedFriends.has(f.friendId))
    );
    setSelectedFriends(new Set());

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab.id) {
        throw new Error('No active tab found');
      }

      if (!tab.url?.includes('facebook.com')) {
        throw new Error('Please navigate to Facebook first');
      }

      const friendRequests = selectedFriendsData.map((friend) => ({
        friendId: friend.friendId,
        friendName: friend.name,
      }));

      // console.log(
      //   'Starting unfriend operation for selected friends:',
      //   friendRequests
      // );

      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'START_UNFRIEND_USERS',
        friendRequests,
        delayMs: 2000, // 2 second delay between unfriend requests
      });

      if (!response.success) {
        throw new Error(response.error || 'Unknown error occurred');
      }
    } catch (error) {
      setUnfriendInProgress(false);
    }
  };

  const handleDeleteInactive = async () => {
    const inactiveIds = inactiveFriends.map((f) => f.friendId);

    if (inactiveIds.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'No Inactive Friends',
        text: 'There are no inactive friends to unfriend.',
      });
      return;
    }

    setUnfriendInProgress(true);
    setUnfriendProgress({
      completed: 0,
      total: inactiveIds.length,
      current: '',
      percentage: 0,
    });

    // Immediately remove inactive friends from popup
    setFriendsData((prev) =>
      prev.filter((f) => !inactiveIds.includes(f.friendId))
    );

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab.id) {
        throw new Error('No active tab found');
      }

      if (!tab.url?.includes('facebook.com')) {
        throw new Error('Please navigate to Facebook first');
      }

      const friendRequests = inactiveFriends.map((friend) => ({
        friendId: friend.friendId,
        friendName: friend.name,
      }));

      // console.log(
      //   'Starting unfriend operation for inactive friends:',
      //   friendRequests
      // );

      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'START_UNFRIEND_USERS',
        friendRequests,
        delayMs: 2000,
      });

      if (!response.success) {
        throw new Error(response.error || 'Unknown error occurred');
      }
    } catch (error) {
      setUnfriendInProgress(false);
    }
  };

  const formatLastUpdate = (timestamp: number) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="friends-impression-container">
      {/* Control Panel (All Actions) */}
      <div className="fi-controls">
        <div className="fi-stats">
          <span className="fi-stat">Friends: {stats.totalFriends}</span>
          <span className="fi-stat">
            Interactions: {stats.totalInteractions}
          </span>
          <span
            className={`fi-status ${
              stats.dataCollectionActive ? 'active' : 'inactive'
            }`}
          >
            {stats.dataCollectionActive ? 'Collecting' : 'Stopped'}
          </span>
        </div>
        <div className="fi-actions">
          {!stats.dataCollectionActive ? (
            <button
              className="fi-control-btn start"
              onClick={handleStartCollection}
              disabled={loading}
              title="Start data collection"
            >
              {React.createElement(FaPlay as any, { size: 12 })}
            </button>
          ) : (
            <button
              className="fi-control-btn stop"
              onClick={handleStopCollection}
              disabled={loading}
              title="Stop data collection"
            >
              {React.createElement(FaStop as any, { size: 12 })}
            </button>
          )}
          <button
            className="fi-control-btn export"
            onClick={handleExportData}
            disabled={friendsData.length === 0}
            title="Export data"
          >
            {React.createElement(FaDownload as any, { size: 12 })}
          </button>
          <button
            className="fi-control-btn clear"
            onClick={handleClearData}
            disabled={friendsData.length === 0}
            title="Clear data"
          >
            {React.createElement(FaTrash as any, { size: 12 })}
          </button>
          <button
            className="fi-control-btn posts-engagement"
            onClick={handlePostApi}
            disabled={loading || !friendsDataCollected}
            title="Collect Posts Engagement Data (Reactions, Comments, Shares)"
            style={{ backgroundColor: '#8e44ad', color: 'white' }}
          >
            {React.createElement(FaChartBar as any, { size: 12 })}
          </button>
        </div>
      </div>

      {/* Conditional UI: Friends List or Engagement Table */}
      {uiMode === 'friends' && (
        <div
          style={{
            margin: '3px 0',
            padding: '5px',
            background: '#faf8f6',
            borderRadius: '8px',
          }}
        >
          <span
            style={{
              fontWeight: 'bold',
              fontSize: '15px',
              color: '#2c3e50',
              marginBottom: '8px',
              display: 'block',
            }}
          >
            Friends List
          </span>
          {/* Show collecting counter if collecting */}
          {stats.dataCollectionActive && (
            <div
              style={{
                color: '#19c37d',
                fontWeight: 'bold',
                marginBottom: '6px',
                fontSize: '13px',
              }}
            >
              Collecting friends: {collectingCount}
            </div>
          )}
          <div
            style={{
              maxHeight: '242px',
              overflowY: 'auto',
              border: '1px solid #faf8f6',
              borderRadius: '6px',
              background: '#faf8f6',
              padding: '2px',
            }}
          >
            {loading && (
              <div className="fi-loading">
                <div className="fi-spinner"></div>
                <span>Loading...</span>
              </div>
            )}

            {!loading && friendsData.length === 0 ? (
              <div
                style={{
                  color: '#7f8c8d',
                  fontStyle: 'italic',
                  textAlign: 'center',
                }}
              >
                No friends data available. Click the play button above to load.
              </div>
            ) : !loading ? (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {friendsData.map((friend) => (
                  <li
                    key={friend.friendId}
                    style={{
                      padding: '5px 0',
                      borderBottom: '1px solid #e0e0e0',
                      color: '#34495e',
                      fontSize: '14px',
                    }}
                  >
                    {friend.name}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      )}

      {uiMode === 'engagement' && (
        <>
          {/* Show collecting posts counter if collecting engagement */}
          {engagementLoading && (
            <div
              style={{
                margin: '3px 0',
                padding: '5px',
                background: '#f8f4ff',
                borderRadius: '8px',
              }}
            >
              <span
                style={{
                  fontWeight: 'bold',
                  fontSize: '15px',
                  color: '#8e44ad',
                  marginBottom: '8px',
                  display: 'block',
                }}
              >
                Posts Engagement Collection
              </span>
              <div
                style={{
                  color: '#8e44ad',
                  fontWeight: 'bold',
                  marginBottom: '6px',
                  fontSize: '13px',
                }}
              >
                Collecting posts: {engagementCollectingCount}
              </div>
            </div>
          )}
          {/* View Mode Toggle & Action Button */}
          {friendsData.length > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px',
              }}
            >
              <div
                className="fi-view-toggle"
                style={{ display: 'flex', gap: '10px' }}
              >
                <button
                  className={`fi-view-btn ${
                    viewMode === 'active' ? 'active' : ''
                  }`}
                  onClick={async () => {
                    setViewMode('active');
                    setCurrentPage(1);
                    await saveToStorage({ viewMode: 'active' });
                  }}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '4px',
                    background: viewMode === 'active' ? '#27ae60' : '#ecf0f1',
                    color: viewMode === 'active' ? 'white' : '#2c3e50',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                  }}
                >
                  Active ({activeFriends.length})
                </button>
                <button
                  className={`fi-view-btn ${
                    viewMode === 'inactive' ? 'active' : ''
                  }`}
                  onClick={async () => {
                    setViewMode('inactive');
                    setCurrentPage(1);
                    await saveToStorage({ viewMode: 'inactive' });
                  }}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '4px',
                    background: viewMode === 'inactive' ? '#7f8c8d' : '#ecf0f1',
                    color: viewMode === 'inactive' ? 'white' : '#2c3e50',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                  }}
                >
                  Inactive ({inactiveFriends.length})
                </button>
              </div>
              
              {/* Action Dropdown UI */}
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <button
                  className="fi-action-toggle-btn"
                  style={{
                    padding: '6px 14px',
                    borderRadius: '4px',
                    background: '#19c37d',
                    color: '#ffffffff',
                    border: '2px solid #19c37d',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    boxShadow: '0 2px 8px rgba(25,195,125,0.10)',
                    cursor: 'pointer',
                    minWidth: '100px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                  }}
                  onClick={() => setShowActionButtons((prev) => !prev)}
                  title="Show actions"
                >
                  <span>Action</span>
                  <span
                    style={{
                      fontSize: '13px',
                      marginLeft: '2px',
                      transition: 'transform 0.2s',
                      transform: showActionButtons
                        ? 'rotate(180deg)'
                        : 'rotate(0deg)',
                    }}
                  >
                    ▼
                  </span>
                </button>
                {showActionButtons && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '110%',
                      right: 0,
                      background: '#fff',
                      border: '1px solid #19c37d',
                      borderRadius: '6px',
                      boxShadow: '0 2px 8px rgba(25,195,125,0.10)',
                      minWidth: '120px',
                      zIndex: 10,
                      padding: '4px 0',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'stretch',
                    }}
                  >
                    <button
                      className="fi-action-menu-btn"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#19c37d',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        padding: '7px 14px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        borderRadius: '0',
                        transition: 'background 0.15s',
                      }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.background = '#eafaf3')
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.background = 'none')
                      }
                      onClick={handleDeleteInactive}
                      disabled={unfriendInProgress}
                    >
                      Delete Inactive
                    </button>
                    <button
                      className="fi-action-menu-btn"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#19c37d',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        padding: '7px 14px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        borderRadius: '0',
                        transition: 'background 0.15s',
                      }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.background = '#eafaf3')
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.background = 'none')
                      }
                      onClick={handleDeleteSelected}
                      disabled={unfriendInProgress}
                    >
                      Delete Selected ({selectedFriends.size})
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Data Table */}
          <div className="fi-table-wrapper">
            {engagementLoading && (
              <div className="fi-loading">
                <div className="fi-spinner"></div>
               {/* Fact API response below toggle */}
              <div style={{ marginLeft: '20px', minWidth: '220px', maxWidth: '320px', background: '#f9f9f9', borderRadius: '6px', padding: '8px', fontSize: '13px', color: '#333' }}>
                <span style={{ fontWeight: 'bold', color: '#19c37d' }}>Random Fact:</span>
                <div style={{ marginTop: '4px', color: '#555' }}>
                  "{factLoading ? 'Loading...' : fact} "
                </div>
              </div>           
             </div>
            )}

            {!engagementLoading && (
              <>
                <div className="fi-table-header-row">
                  <div className="fi-th" style={{ width: '32px' }}>
                    <input
                      type="checkbox"
                      style={{
                        accentColor: '#19c37d',
                        width: '15px',
                        height: '15px',
                      }}
                      checked={
                        friendsPageData.length > 0 &&
                        friendsPageData.every((f) =>
                          selectedFriends.has(f.friendId)
                        )
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      disabled={unfriendInProgress}
                    />
                  </div>
                  <div className="fi-th fi-th-name">Name</div>
                  <div className="fi-th">
                    {React.createElement(BiLike as any, { size: 18 })}
                  </div>
                  <div className="fi-th">
                    {React.createElement(MdOutlineComment as any, { size: 18 })}
                  </div>
                  <div className="fi-th">
                    {React.createElement(FiShare2 as any, { size: 18 })}
                  </div>
                  {/* <div className="fi-th fi-th-action">Last Update</div> */}
                </div>

                {friendsPageData.length === 0 ? (
                  <div className="fi-empty-state">
                    <p>
                      {viewMode === 'active'
                        ? 'No active friends found'
                        : 'No inactive friends found'}
                    </p>
                    <p className="fi-empty-hint">
                      {viewMode === 'active'
                        ? 'Active friends have at least one like, comment, or share.'
                        : 'Inactive friends have zero likes, comments, and shares.'}
                    </p>
                  </div>
                ) : (
                  <>
                    {friendsPageData.map(
                      (row: FriendsInteractionData, idx: number) => (
                        <div className="fi-table-row" key={row.friendId || idx}>
                          <div
                            className="fi-td"
                            style={{ width: '32px', textAlign: 'center' }}
                          >
                            <input
                              type="checkbox"
                              style={{
                                accentColor: '#19c37d',
                                width: '15px',
                                height: '15px',
                              }}
                              checked={selectedFriends.has(row.friendId)}
                              onChange={(e) =>
                                handleSelectFriend(
                                  row.friendId,
                                  e.target.checked
                                )
                              }
                              disabled={unfriendInProgress}
                            />
                          </div>
                          <div className="fi-td fi-td-name" title={row.name}>
                            {row.name}
                          </div>
                          <div className="fi-td">{row.totalLikes}</div>
                          <div className="fi-td">{row.totalComments}</div>
                          <div className="fi-td">{row.totalShares}</div>
                        </div>
                      )
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* Pagination */}
          {TOTAL_PAGES > 1 && !engagementLoading && (
            <div className="fi-pagination">
              <button
                className="fi-page-btn"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                &lsaquo;
              </button>

              {TOTAL_PAGES <= 4
                ? // Show all pages if 4 or fewer
                  Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        className={`fi-page-btn${
                          currentPage === page ? ' active' : ''
                        }`}
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </button>
                    )
                  )
                : // Show moving window of 3 pages centered around current page
                  (() => {
                    let startPage: number, endPage: number;

                    if (currentPage <= 2) {
                      // Show pages 1, 2, 3 when current page is 1 or 2
                      startPage = 1;
                      endPage = 3;
                    } else if (currentPage >= TOTAL_PAGES - 1) {
                      // Show last 3 pages when current page is near the end
                      startPage = TOTAL_PAGES - 2;
                      endPage = TOTAL_PAGES;
                    } else {
                      // Show current page in the middle of 3 pages
                      startPage = currentPage - 1;
                      endPage = currentPage + 1;
                    }

                    return (
                      <>
                        {/* Show first page and ellipsis if needed */}
                        {startPage > 1 && (
                          <>
                            <button
                              className="fi-page-btn"
                              onClick={() => handlePageChange(1)}
                            >
                              1
                            </button>
                            {startPage > 2 && (
                              <span className="fi-page-ellipsis">...</span>
                            )}
                          </>
                        )}

                        {/* Show the moving window of pages */}
                        {Array.from(
                          { length: endPage - startPage + 1 },
                          (_, i) => startPage + i
                        ).map((page) => (
                          <button
                            key={page}
                            className={`fi-page-btn${
                              currentPage === page ? ' active' : ''
                            }`}
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </button>
                        ))}

                        {/* Show ellipsis and last page if needed */}
                        {endPage < TOTAL_PAGES && (
                          <>
                            {endPage < TOTAL_PAGES - 1 && (
                              <span className="fi-page-ellipsis">...</span>
                            )}
                            <button
                              className="fi-page-btn"
                              onClick={() => handlePageChange(TOTAL_PAGES)}
                            >
                              {TOTAL_PAGES}
                            </button>
                          </>
                        )}
                      </>
                    );
                  })()}

              <button
                className="fi-page-btn"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === TOTAL_PAGES}
              >
                &rsaquo;
              </button>
            </div>
          )}
        </>
      )}

      {/* Post Limit Popup */}
      {showPostLimitPopup && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#fff',
              padding: '30px',
              borderRadius: '10px',
              boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
              minWidth: '260px',
              maxWidth: '280px',
              textAlign: 'center',
            }}
          >
            <h3
              style={{
                margin: '0 0 20px 0',
                color: '#333',
                fontSize: '18px',
                fontWeight: '600',
              }}
            >
              Set Posts Limit
            </h3>
            <p
              style={{
                margin: '0 0 20px 0',
                color: '#666',
                fontSize: '14px',
                lineHeight: '1.4',
              }}
            >
              Enter the maximum number of posts to fetch for engagement data
              collection.
            </p>
            <div style={{ marginBottom: '25px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: '#555',
                  fontSize: '14px',
                  fontWeight: '500',
                  textAlign: 'left',
                }}
              >
                Posts Limit:
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={postLimit}
                onChange={(e) => setPostLimit(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '16px',
                  textAlign: 'center',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#19c37d')}
                onBlur={(e) => (e.target.style.borderColor = '#e1e5e9')}
                placeholder="50"
              />
            </div>
            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
              }}
            >
              <button
                onClick={() => setShowPostLimitPopup(false)}
                style={{
                  padding: '12px 24px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  background: '#fff',
                  color: '#666',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#bdc3c7';
                  e.currentTarget.style.color = '#555';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = '#e1e5e9';
                  e.currentTarget.style.color = '#666';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleStartPostsCollection}
                style={{
                  padding: '12px 24px',
                  border: '2px solid #19c37d',
                  borderRadius: '8px',
                  background: '#19c37d',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#16a568';
                  e.currentTarget.style.borderColor = '#16a568';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#19c37d';
                  e.currentTarget.style.borderColor = '#19c37d';
                }}
              >
                Start Collection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unfriend Progress Indicator */}
      {unfriendInProgress && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#fff',
              padding: '50px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              minWidth: '300px',
              textAlign: 'center',
            }}
          >
            <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>
              Unfriending Friends...
            </h3>
            <div
              style={{
                background: '#f0f0f0',
                borderRadius: '10px',
                height: '8px',
                overflow: 'hidden',
                marginBottom: '10px',
              }}
            >
              <div
                style={{
                  background: '#19c37d',
                  height: '100%',
                  borderRadius: '10px',
                  width: `${unfriendProgress.percentage}%`,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
              {unfriendProgress.completed} of {unfriendProgress.total} completed
              ({unfriendProgress.percentage}%)
            </p>
            <p style={{ margin: '5px 0', fontSize: '12px', color: '#888' }}>
              Current: {unfriendProgress.current}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default FriendsImpression;
