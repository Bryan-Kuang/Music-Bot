/**
 * Bilibili API utilities for searching and fetching video information
 */

const axios = require("axios");
const logger = require("./logger");

class BilibiliAPI {
  constructor() {
    this.baseURL = "https://api.bilibili.com";
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://www.bilibili.com/",
    };
  }

  /**
   * Search for videos on Bilibili
   * @param {string} keyword - Search keyword
   * @param {number} page - Page number (default: 1)
   * @param {number} pageSize - Number of results per page (default: 20)
   * @returns {Promise<Array>} Array of video objects
   */
  async searchVideos(keyword, page = 1, pageSize = 20) {
    try {
      logger.info("Searching Bilibili videos", {
        keyword,
        page,
        pageSize,
      });

      const response = await axios.get(
        "https://api.bilibili.com/x/web-interface/search/type",
        {
          params: {
            search_type: "video",
            keyword: keyword,
            page: page,
            pagesize: pageSize,
            order: "totalrank",
            duration: 0,
            tids: 0,
          },
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://www.bilibili.com/",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-site",
          },
          timeout: 10000,
        }
      );

      if (response.data && response.data.code === 0) {
        return this.parseSearchResults(response.data.data);
      } else {
        logger.warn("Bilibili API returned error", {
          code: response.data?.code,
          message: response.data?.message,
        });
        return [];
      }
    } catch (error) {
      logger.error("Error searching Bilibili videos", {
        error: error.message,
        keyword,
        page,
      });
      return [];
    }
  }

  /**
   * Parse search results and extract video information
   * @param {Object} data - Raw search data from API
   * @returns {Object} Parsed video results
   */
  parseSearchResults(data) {
    const videos = [];

    // Extract video results from the response
    if (data.result && Array.isArray(data.result)) {
      for (const item of data.result) {
        if (item.result_type === "video" && Array.isArray(item.data)) {
          for (const video of item.data) {
            videos.push(this.parseVideoInfo(video));
          }
        }
      }
    }

    return {
      videos,
      total: data.numResults || 0,
      page: data.page || 1,
      pageSize: data.pagesize || 20,
    };
  }

  /**
   * Parse individual video information
   * @param {Object} video - Raw video data
   * @returns {Object} Parsed video info
   */
  parseVideoInfo(video) {
    return {
      bvid: video.bvid,
      aid: video.aid,
      title: video.title.replace(/<[^>]*>/g, ""), // Remove HTML tags
      author: video.author,
      mid: video.mid,
      description: video.description || "",
      pic: video.pic,
      duration: this.parseDuration(video.duration),
      pubdate: video.pubdate,
      view: video.play || 0,
      like: video.like || 0,
      danmaku: video.danmaku || 0,
      tag: video.tag || "",
      url: `https://www.bilibili.com/video/${video.bvid}`,
    };
  }

  /**
   * Parse duration string to seconds
   * @param {string} duration - Duration string (e.g., "03:45")
   * @returns {number} Duration in seconds
   */
  parseDuration(duration) {
    if (!duration || typeof duration !== "string") return 0;

    const parts = duration.split(":").map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1]; // MM:SS
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
    }
    return 0;
  }

  /**
   * Search for Hachimi videos with quality filtering
   * @param {number} maxResults - Maximum number of results to return (default: 10)
   * @returns {Promise<Array>} Array of qualified video objects
   */
  async searchHachimiVideos(maxResults = 10) {
    try {
      logger.info("Searching for Hachimi videos", { maxResults });

      // Search for videos with "哈基米" keyword
      const searchResults = await this.searchVideos("哈基米", 1, 50);

      // Handle case where search returns empty array
      if (!searchResults || searchResults.length === 0) {
        logger.warn("No Hachimi videos found in search results");
        return [];
      }

      // Filter videos based on quality criteria
      const qualifiedVideos = this.filterQualityVideos(searchResults);

      // Limit to maxResults
      const limitedResults = qualifiedVideos.slice(0, maxResults);

      logger.info("Hachimi video search completed", {
        totalFound: searchResults.length,
        qualified: qualifiedVideos.length,
      });

      return limitedResults;

    } catch (error) {
      logger.error("Error searching Hachimi videos", {
        error: error.message,
        stack: error.stack,
      });
      return [];
    }
  }

  /**
   * Get video details by BVID
   * @param {string} bvid - Bilibili video ID
   * @returns {Promise<Object>} Video details
   */
  async getVideoDetails(bvid) {
    try {
      const url = `${this.baseURL}/x/web-interface/view`;
      const params = { bvid };

      const response = await axios.get(url, {
        params,
        headers: this.headers,
        timeout: 10000,
      });

      if (response.data.code !== 0) {
        throw new Error(`Failed to get video details: ${response.data.message}`);
      }

      return response.data.data;

    } catch (error) {
      logger.error("Error getting video details", {
        error: error.message,
        bvid,
      });
      throw error;
    }
  }
}

module.exports = new BilibiliAPI();