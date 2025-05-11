const express = require("express");
const { searchPost } = require("../controllers/search-controller");
const { authenticateRequest } = require("../middleware/auth-middleware");

const router = express.Router();

router.use(authenticateRequest);

router.get("/post", searchPost);

module.exports = router;
