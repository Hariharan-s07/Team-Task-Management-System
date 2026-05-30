const User = require('../models/User');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const jwt = require('jsonwebtoken');

const getRefreshCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: process.env.NODE_ENV === 'development' ? 'lax' : 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});

const getClearCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: process.env.NODE_ENV === 'development' ? 'lax' : 'none'
});

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => { // Added next for error handling
    try {
        const { name, email, password, role } = req.body; // Role is here for testing, usually default MEMBER

        const userExists = await User.findOne({ email });

        if (userExists) {
            res.status(400);
            throw new Error('User already exists');
        }

        // Role security: Only Admin can create Admin? 
        // Requirement: "Admin can create users".
        // For registration: "User Registration & Login". Usually Member registration is public or Admin only.
        // "Admin can create users" implies Admin creates them. 
        // But "User Registration" implies public signup.
        // I will allow public signup as MEMBER.
        // If Admin creation is needed, that will be in UserController.

        const user = await User.create({
            name,
            email,
            password,
            role: 'MEMBER' // Force MEMBER on public registration
        });

        if (user) {
            const accessToken = generateAccessToken(user._id);
            const refreshToken = generateRefreshToken(user._id);

            // Save refresh token to user
            user.refreshToken = [refreshToken]; // array for multiple devices
            await user.save();

            // Send Refresh Token in Cookie
            res.cookie('jwt', refreshToken, getRefreshCookieOptions());

            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: accessToken
            });
        } else {
            res.status(400);
            throw new Error('Invalid user data');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password +refreshToken');

        if (user && (await user.matchPassword(password))) {
            const accessToken = generateAccessToken(user._id);
            const refreshToken = generateRefreshToken(user._id);

            // Save refresh token
            // If user has other refresh tokens, keep them? Or replace?
            // "Logout must invalidate refresh token".
            // Simple strategy: Append new token.
            let newRefreshTokenArray = !user.refreshToken ? [] : user.refreshToken;
            newRefreshTokenArray.push(refreshToken);
            user.refreshToken = newRefreshTokenArray;
            await user.save();

            res.cookie('jwt', refreshToken, getRefreshCookieOptions());

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: accessToken
            });
        } else {
            res.status(401);
            throw new Error('Invalid email or password');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public
const logoutUser = async (req, res, next) => {
    // Client should also delete access token.
    try {
        const cookies = req.cookies;
        if (!cookies?.jwt) return res.sendStatus(204); // No content

        const refreshToken = cookies.jwt;
        const user = await User.findOne({ refreshToken }).select('+refreshToken').exec();

        if (!user) {
            res.clearCookie('jwt', getClearCookieOptions());
            return res.sendStatus(204);
        }

        // Delete refreshToken in db
        user.refreshToken = (user.refreshToken || []).filter(rt => rt !== refreshToken);
        await user.save();

        res.clearCookie('jwt', getClearCookieOptions());
        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Refresh access token
// @route   GET /api/auth/refresh
// @access  Public
const refresh = async (req, res, next) => {
    try {
        const cookies = req.cookies;
        if (!cookies?.jwt) return res.status(401).json({ message: 'Unauthorized' });

        const refreshToken = cookies.jwt;
        const user = await User.findOne({ refreshToken }).select('+refreshToken').exec();

        if (!user) return res.status(403).json({ message: 'Forbidden' }); // Reuse detection possible here

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        if (user._id.toString() !== decoded.id) return res.status(403).json({ message: 'Forbidden' });

        const accessToken = generateAccessToken(user._id);

        res.json({ token: accessToken });
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({ message: 'Forbidden' });
        }
        next(error);
    }
}

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    refresh
};
