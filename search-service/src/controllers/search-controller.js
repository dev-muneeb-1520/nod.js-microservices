const logger = require("../utils/logger");
const Search = require("../models/search-post");

const searchPost = async (req, res) => {
  logger.info("Search endpoint hit...");
  try {
    const { query } = req.query;

    const results = await Search.find(
      { $text: { $search: query } },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(10);

    if (!results) {
      return res.status(200).json({
        success: false,
        results: [],
      });
    }

    return res.status(200).json({
      success: true,
      results: results,
    });
  } catch (error) {
    logger.error("Error during search the post", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  searchPost,
};
