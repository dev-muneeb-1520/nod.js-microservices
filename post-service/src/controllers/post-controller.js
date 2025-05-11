const logger = require("../utils/logger");
const { validateCreatePost } = require("../utils/validation");
const { invalidatePostsCache } = require("../utils/invalidate-posts-cache");
const Post = require("../models/post-model");
const { publishEvent } = require("../utils/rabbitmq");

const createPost = async (req, res) => {
  logger.info("Creating post...");
  try {
    //validate the post schema
    const { error } = validateCreatePost(req.body);
    if (error) {
      logger.warn("Validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { content, mediaIds } = req.body;

    const newlyCreatedPost = await Post.create({
      user: req.user.userId,
      content,
      mediaIds: mediaIds || [],
    });

    await newlyCreatedPost.save();

    await publishEvent("post.created", {
      postId: newlyCreatedPost._id.toString(),
      userId: newlyCreatedPost.user.toString(),
      content: newlyCreatedPost.content,
      createdAt: newlyCreatedPost.createdAt,
    });

    await invalidatePostsCache(req, newlyCreatedPost._id.toString());
    logger.info("Post created successfully", newlyCreatedPost);
    return res.status(201).json({
      success: true,
      message: "Post Ceated Successfully",
    });
  } catch (error) {
    logger.error("Error creating post", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const getAllPosts = async (req, res) => {
  logger.info("Fetching all posts...");
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    const cacheKey = `posts:${page}:${limit}`;
    const cachedPosts = await req.redisClient.get(cacheKey);

    if (cachedPosts) {
      return res.status(200).json(JSON.parse(cachedPosts));
    }

    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    const totalNoOfPosts = await Post.countDocuments();

    const result = {
      posts,
      currentPage: page,
      totalPages: Math.ceil(totalNoOfPosts / limit),
      totalPosts: totalNoOfPosts,
    };

    //save your posts in redis cache
    await req.redisClient.setex(cacheKey, 300, JSON.stringify(result));

    return res.status(200).json(result);
  } catch (error) {
    logger.error("Error while fetching posts", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const getPost = async (req, res) => {
  logger.info("Fetching post...");
  try {
    const postId = req.params.id;
    const cacheKey = `post:${postId}`;
    const cachedPost = await req.redisClient.get(cacheKey);

    if (cachedPost) {
      return res.status(200).json(JSON.parse(cachedPost));
    }

    const getPost = await Post.findById(postId);
    if (!getPost) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    await req.redisClient.setex(cachedPost, 3600, JSON.stringify(getPost));

    return res.status(200).json(getPost);
  } catch (error) {
    logger.error("Error while fetching post", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const deletePost = async (req, res) => {
  logger.info("Deleting post...");
  try {
    const postId = req.params.id;
    const userId = req.user.userId;

    const post = await Post.findOneAndDelete({
      _id: postId,
      user: userId,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    //publish post delete method
    await publishEvent("post.deleted", {
      postId: post._id.toString(),
      userId: req.user.userId,
      mediaIds: post.mediaIds,
    });

    await invalidatePostsCache(req, postId);
    res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    logger.error("Error while deleting post", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  createPost,
  getAllPosts,
  getPost,
  deletePost,
};
