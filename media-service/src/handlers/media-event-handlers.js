const Media = require("../models/media-model");
const { deleteMediaFromCloudinary } = require("../utils/cloudinary");
const logger = require("../utils/logger");

const handlePostDeleted = async (event) => {
  console.log(event, "event happening");
  const { postId, mediaIds } = event;
  try {
    const mediaToDelete = await Media.find({
      _id: {
        $in: mediaIds,
      },
    });

    for (const media of mediaToDelete) {
      await deleteMediaFromCloudinary(media.publicId);
      await Media.findByIdAndDelete(media._id);
      logger.info(
        `Deleted media ${media._id} associated with this deleted post ${postId}`
      );
    }
    logger.info(`Process deletion of media for post id ${postId}`);
  } catch (e) {
    logger.error("Error occured while media deletion", e);
  }
};

module.exports = {
  handlePostDeleted,
};
