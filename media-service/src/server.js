require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const mediaRoutes = require("./routes/media-routes");
const errorHandler = require("./middleware/error-handler");
const logger = require("./utils/logger");
const { connectToRabbitMQ, consumeEvent } = require("./utils/rabbitmq");
const { handlePostDeleted } = require("./handlers/media-event-handlers");

const app = express();
const PORT = process.env.PORT || 3003;

//connect to mongoDB
mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => logger.info("Connected to MongoDB"))
  .catch((e) => logger.error("MongoDB connection error", e));

app.use(cors());
app.use(helmet());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body, ${req.body}`);
  next();
});

app.use("/api/media", mediaRoutes);

app.use(errorHandler);

async function startServer() {
  try {
    await connectToRabbitMQ();

    //consume all the events
    await consumeEvent("post.deleted", handlePostDeleted);

    app.listen(PORT, () => {
      logger.info(`Media service is runnning on port ${PORT}`);
    });
  } catch (e) {
    logger.error("Failed to connect to server", e);
    process.exit(1);
  }
}

startServer();

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled rejection at", promise, "reason", reason);
});
