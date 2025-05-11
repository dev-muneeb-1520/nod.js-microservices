const logger = require("../utils/logger");
const { validateRegistration, validateLogin } = require("../utils/validaiton");
const User = require("../models/user-model");
const RefreshToken = require("../models/refresh-token");
const generateTokens = require("../utils/generate-token");

//user registration
const registerUser = async (req, res) => {
    logger.info("Registering user...");
    try{
        //validate the schema
        const { error } = validateRegistration(req.body);
        if (error) {
            logger.warn(`Validation error: ${error.details[0].message}`);
            return res.status(400).json({
                success: false,
                message: error.details[0].message,
            });
        }

        const {email, password, username} = req.body;

        //check if user already exists
        let user = await User.findOne({
            $or: [{email}, {username}]
        });

        if (user) {
            logger.warn("User already exists");
             return res.status(400).json({
                success: false,
                message: "User already exists",
            });
        }

        user = new User({
            username,
            email,
            password
        })
        await user.save();
        logger.warn(`User registered successfully: ${user._id}`);

        const { accessToken, refreshToken } = await generateTokens(user);

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            accessToken,
            refreshToken,
        })

    } catch(error) {
        logger.error(`Registration error occurred: ${error.message}`);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
}

//user login
const loginUser = async(req,res) => {
    logger.info("Logging in user...");
    try{

        const {error} = validateLogin(req.body);
        if (error) {
            logger.warn(`Validation error: ${error.details[0].message}`);
            return res.status(400).json({
                success: false,
                message: error.details[0].message,
            });
        }

        const {email, password} = req.body;

        const user = await User.findOne({email});
        if(!user) {
            logger.warn("Invalid User");
            return res.status(400).json({
                success: false,
                message: "Invalid Crdentials",
            })
        }

        //valid password or not
        const isValidPassword = await user.comparePassword(password);
        if(!isValidPassword) {
            logger.warn("Invalid Password");
            return res.status(400).json({
                success: false,
                message: "Invalid Password",
            })
        }

        const {accessToken, refreshToken} = await generateTokens(user);

        res.status(200).json({
            success: true,
            message: "User logged in successfully",
            accessToken,
            refreshToken,
            userId: user._id,
        });

    } catch(error){
        logger.error(`Login error occurred: ${error.message}`);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
}

// refresh token
const refreshTokenAuthenticator = async (req,res) => {
    logger.info("Refreshing token...");
    try{

        const {refreshToken} = req.body;
        if(!refreshToken) {
            logger.warn("Refresh token is missing");
            return res.status(400).json({
                success: false,
                message: "Refresh token is missing",
            });
        }

        const storedToken = await RefreshToken.findOne({token: refreshToken});
        if(!storedToken || storedToken.expiresAt < new Date()) {
            logger.warn("Invalid or expired refresh token");
            return res.status(401).json({
                success: false,
                message: "Invalid or expired refresh token",
            });
        }

        const user = await User.findById(storedToken.user);
        if(!user) {
            logger.warn("User not found");
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const {accessToken: newAccessToken, refreshToken: newFreshToken} = await generateTokens(user);

        //delete the old refresh token
        await RefreshToken.deleteOne({_id: storedToken._id});

        res.status(200).json({
            success: true,
            message: "Token refreshed successfully",
            accessToken: newAccessToken,
            refreshToken: newFreshToken,
        })

    } catch(error) {
        logger.error(`Refresh token error occurred: ${error.message}`);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }

}

//logout
const logoutUser = async(req,res) => {
    logger.info("Logging out user...");
    try{

        const {refreshToken} = req.body;
        if(!refreshToken) {
            logger.warn("Refresh token is missing");
            return res.status(400).json({
                success: false,
                message: "Refresh token is missing",
            });
        }

        //delete the refresh token
        await RefreshToken.deleteOne({token: refreshToken});
        logger.info("Refresh token deleted for logout");

        res.status(200).json({
            success: true,
            message: "User logged out sccessfully",
        });

    } catch(error) {
        logger.error(`Error while logging out: ${error.message}`);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
}

module.exports = {registerUser, loginUser, refreshTokenAuthenticator, logoutUser};