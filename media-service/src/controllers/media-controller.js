const logger = require("../utils/logger");
const { uploadMediaToCloudinary } = require("../utils/cloudinary");
const Media = require("../models/media-model");

const uploadMedia = async (req, res) => {
  logger.info("Starting media to upload...");
  try {
    if (!req.file) {
      logger.error("No file found, please add a file and try again");
      return res.status(400).json({
        success: false,
        message: "No file found, please add a file and try again",
      });
    }

    const { originalname, mimetype, buffer } = req.file;
    const userId = req.user.userId;

    logger.info(`File details: name=${originalname}, type=${mimetype}`);
    logger.info("Uploading to cloudinary starting...");

    const cloudinaryUploadResult = await uploadMediaToCloudinary(req.file);
    logger.info(
      `Cloudinary upload successfully. Public Id: - ${cloudinaryUploadResult.public_id}`
    );

    const newlyCreatedMedia = await Media({
      publicId: cloudinaryUploadResult.public_id,
      originalName: originalname,
      mimeType: mimetype,
      url: cloudinaryUploadResult.secure_url,
      userId: userId,
    });

    await newlyCreatedMedia.save();

    return res.status(201).json({
      success: true,
      mediaId: newlyCreatedMedia._id,
      url: newlyCreatedMedia.url,
      message: "Media upload successfull",
    });
  } catch (error) {
    logger.error(`Error occured while uploading media: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const getAllMedia = async (req, res) => {
  try {
    const results = await Media.find({});
    if (!results) {
      return res.status(400).json({
        success: false,
        results: [],
      });
    }
    return res.status(200).json({
      success: true,
      message: "Fetced all media successfully",
      results: results,
    });
  } catch (error) {
    logger.error(`Error fetching medias: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Error fetching medias",
    });
  }
};

module.exports = {
  uploadMedia,
  getAllMedia,
};
