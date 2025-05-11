const logger = require("../utils/logger");
const Search = require("../models/search-post");

async function handlePostCreated(event) {
  try {
    const newSearchPost = new Search({
      postId: event.postId,
      userId: event.userId,
      content: event.content,
      createdAt: event.createdAt,
    });

    await newSearchPost.save();
    logger.info(
      `Search post created: ${event.postId}, ${newSearchPost._id.toString()}`
    );
  } catch (e) {
    logger.error("Error handling post creation event", e);
  }
}

async function handlePostDeleted(event) {
  try {
    await Search.findOneAndDelete({
      postId: event.postId,
    });
    logger.info(`Search post deleted: ${event.postId}}`);
  } catch (e) {
    logger.error("Error handling post deletion event", e);
  }
}

module.exports = {
  handlePostCreated,
  handlePostDeleted,
};
