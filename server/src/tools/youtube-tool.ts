import { tool } from "ai";
import z from "zod";
import { oauth2Client } from "../index.ts";
import { google } from "googleapis";

const searchYoutubeVideos = tool({
  name: "searchYoutubeVideos",
  description: "Search YouTube for videos based on a query and other filters.",
  inputSchema: z.object({
    query: z.string().describe("The search query."),
    maxResults: z.number().optional().default(5),
    order: z
      .enum([
        "date",
        "rating",
        "relevance",
        "title",
        "videoCount",
        "viewCount",
      ])
      .optional()
      .default("relevance")
      .describe("How to sort the results."),
    safeSearch: z
      .enum(["moderate", "strict", "none"])
      .optional()
      .default("moderate")
      .describe("Filter results for restricted content."),
  }),
  execute: async (input) => {
    const { query, maxResults, order, safeSearch } = input;

    try {
      console.log(`Setting credentials for YouTube search...`);
        
      const youtube = google.youtube({ version: "v3", auth: oauth2Client });

      console.log(`Searching YouTube for: "${query}"`);
      const searchResponse = await youtube.search.list({
        part: ["snippet"],
        q: query,
        maxResults: maxResults,
        order: order,
        safeSearch: safeSearch,
        type: ["video"],
      });

      const videoIdItems = searchResponse.data.items;
      if (!videoIdItems || videoIdItems.length === 0) {
        console.log("No video results found.");
        return [];
      }

      const videoIds = videoIdItems.map((item) => item?.id?.videoId).join(",");

      console.log(`Fetching details for ${videoIdItems.length} video IDs: ${videoIds}`);
      const detailsResponse = await youtube.videos.list({
        part: ["snippet", "statistics", "contentDetails"],
        id: [videoIds],
      });

      const videoDetails = detailsResponse.data.items;
      console.log(`Video details: ${JSON.stringify(videoDetails)}`);
      if (!videoDetails) {
        console.log("Could not fetch video details, API response was empty.");
        return [];
      }

      const formattedResults = videoDetails.map((video) => ({
        title: video?.snippet?.title,
        channel_name: video?.snippet?.channelTitle,
        channel_id: video?.snippet?.channelId,
        url: `https://www.youtube.com/watch?v=${video?.id}`,
        publish_date: new Date(video?.snippet?.publishedAt || '').toISOString(),
        video_length: video?.contentDetails?.duration,
        view_count: parseInt(video?.statistics?.viewCount || '0', 10),
        like_count: parseInt(video?.statistics?.likeCount || '0', 10),
        thumbnail_url: video?.snippet?.thumbnails?.default?.url,
      }));

      console.log(`Successfully formatted ${formattedResults.length} results.`);
      return formattedResults;
      
    } catch (error) {
      console.error("Error searching YouTube videos:", error instanceof Error ? error.message : String(error));
      throw new Error(
        `Failed to search YouTube: ${error instanceof Error ? error.message : String(error)}. Check API key and service account setup.`
      );
    }
  },
});

const getChannelInfo = tool({
    name: "getChannelInfo",
    description: "Retrieves detailed information, including statistics, subscription count, and metadata, for a specific YouTube channel using its ID.",
    inputSchema: z.object({
      channelId: z.string().describe("The unique ID of the YouTube channel (e.g., 'UC_x5XG1OV2P6wzzfT-P9RSQ')."),
    }),
    execute: async (input) => {
      const { channelId } = input;
  
      if (!channelId) {
        throw new Error("Channel ID is required to fetch details.");
      }
  
      try {
        console.log(`Setting credentials for YouTube channel details fetch...`);
        
        const youtube = google.youtube({ version: "v3", auth: oauth2Client });
  
        console.log(`Fetching details for channel ID: ${channelId}`);
        const detailsResponse = await youtube.channels.list({
          part: ["snippet", "statistics"],
          id: [channelId],
        });
  
        const channelDetails = detailsResponse.data.items;
        if (!channelDetails || channelDetails.length === 0) {
          console.log(`No details found for channel ID: ${channelId}`);
          return null;
        }
        
        const channel = channelDetails[0];
  
        const formattedResult = {
          channel_id: channel?.id,
          title: channel?.snippet?.title,
          description: channel?.snippet?.description,
          custom_url: channel?.snippet?.customUrl,
          published_at: new Date(channel?.snippet?.publishedAt || '').toISOString(),
          country: channel?.snippet?.country,
          subscriber_count: parseInt(channel?.statistics?.subscriberCount || '0', 10),
          video_count: parseInt(channel?.statistics?.videoCount || '0', 10),
          view_count: parseInt(channel?.statistics?.viewCount || '0', 10),
          is_hidden: channel?.statistics?.hiddenSubscriberCount || false,
          thumbnail_url: channel?.snippet?.thumbnails?.high?.url,
        };
  
        console.log(`Successfully fetched and formatted details for channel: ${formattedResult.title}`);
        return formattedResult;
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error fetching YouTube channel details:", errorMessage);
        
        throw new Error(
          `Failed to fetch YouTube channel details: ${errorMessage}. Check API key and service account setup.`
        );
      }
    },
});

const getChannelVideos = tool({
    name: "getChannelVideos",
    description: "Retrieves a list of the most recent videos uploaded by a specific YouTube channel.",
    inputSchema: z.object({
      channelId: z.string().describe("The unique ID of the YouTube channel (e.g., 'UC_x5XG1OV2P6wzzfT-P9RSQ')."),
      maxResults: z.number().optional().default(5).describe("The maximum number of videos to return."),
    }),
    execute: async (input) => {
      const { channelId, maxResults } = input;
  
      if (!channelId) {
        throw new Error("Channel ID is required to fetch videos.");
      }
  
      try {
        console.log(`Setting credentials for YouTube channel videos fetch...`);
  
        const youtube = google.youtube({ version: "v3", auth: oauth2Client });
  
        console.log(`Searching for recent videos from channel ID: ${channelId}`);
        
        const searchResponse = await youtube.search.list({
          part: ["snippet"],
          channelId: channelId,
          type: ["video"],
          order: "date",
          maxResults: maxResults,
        });
  
        const searchItems = searchResponse.data?.items || [];
        
        const videoIds = searchItems
          .filter((item) => item && item.id && item.id.videoId)
          .map((item) => item.id!.videoId as string);
  
        if (videoIds.length === 0) {
          console.log(`No recent videos found for channel ID: ${channelId}`);
          return [];
        }
  
        console.log(`Fetching rich details for ${videoIds.length} videos...`);
        const detailsResponse = await youtube.videos.list({
          part: ["snippet", "statistics", "contentDetails"],
          id: videoIds,
        });
  
        const videoDetails = detailsResponse.data?.items || [];
  
        const validVideos = videoDetails.filter((video) => 
            video && video.id && video.snippet && video.contentDetails && video.statistics
        );
  
        const formattedResults = validVideos.map((video) => {
          const description = video.snippet?.description || '';
  
          return {
            video_id: video.id,
            title: video.snippet?.title,
            channel_name: video.snippet?.channelTitle,
            description_summary: description.substring(0, 150) + (description.length > 150 ? '...' : ''), 
            url: `https://www.youtube.com/watch?v=${video.id}`,
            publish_date: new Date(video.snippet?.publishedAt || '').toISOString(),
            video_length: video.contentDetails?.duration,
            view_count: parseInt(video.statistics?.viewCount || '0', 10),
            like_count: parseInt(video.statistics?.likeCount || '0', 10),
            thumbnail_url: video.snippet?.thumbnails?.high?.url,
          };
        });
  
        console.log(`Successfully retrieved ${formattedResults.length} recent videos from channel ID: ${channelId}.`);
        return formattedResults;
        
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error fetching YouTube channel videos:", errorMessage);
        
        throw new Error(
          `Failed to fetch YouTube channel videos: ${errorMessage}. Check API key and authentication.`
        );
      }
    },
  });

export { searchYoutubeVideos, getChannelInfo, getChannelVideos };
