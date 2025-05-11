const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const RefreshToken = require("../models/refresh-token");

const generateTokens = async (user) => {
    const accessToken = jwt.sign({
        userId: user._id,
        username: user.usernmae,
        email: user.email,
    }, process.env.JWT_SECRET, { expiresIn: "15m"});

    const refreshToken = crypto.randomBytes(64).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    await RefreshToken.create({
        token: refreshToken,
        user: user._id,
        expiresAt: expiresAt,
    })

    return { accessToken, refreshToken };
}

module.exports = generateTokens;