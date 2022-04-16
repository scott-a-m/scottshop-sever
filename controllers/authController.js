const User = require("../models/User");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");
const {
  sendVerificationEmail,
  attachCookiesToResponse,
  createTokenUser,
  sendResetPasswordEmail,
  createHash,
} = require("../utils");
const Token = require("../models/Token");
const crypto = require("crypto");

const register = async (req, res) => {
  const { email, name, password } = req.body;

  const emailAlreadyExists = await User.findOne({ email });
  if (emailAlreadyExists) {
    throw new CustomError.BadRequestError("Email already exists");
  }

  // first registered user is an admin
  const isFirstAccount = (await User.countDocuments({})) === 0;
  const role = isFirstAccount ? "admin" : "user";

  const verificationToken = crypto.randomBytes(40).toString("hex");

  const user = await User.create({
    name,
    email,
    password,
    role,
    verificationToken,
  });

  const origin = req.get("origin");

  await sendVerificationEmail({
    name: user.name,
    email: user.email,
    verificationToken: user.verificationToken,
    origin,
  });

  // send verification token back only while testing in postman

  res
    .status(StatusCodes.CREATED)
    .json({ msg: "Success. Please check your email." });
};

const verifyEmail = async (req, res) => {
  const { verificationToken, email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    throw new CustomError.UnauthenticatedError("Verification Failed");
  }

  if (user.verificationToken !== verificationToken) {
    throw new CustomError.UnauthenticatedError("Verification Failed");
  }

  user.isVerified = true;
  user.verified = Date.now();
  user.verificationToken = "";
  await user.save();

  res.status(StatusCodes.OK).json({ msg: "email verified" });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new CustomError.BadRequestError("Please provide email and password");
  }
  const user = await User.findOne({ email });

  if (!user) {
    throw new CustomError.UnauthenticatedError(
      "Please make sure you enter a valid email and password"
    );
  }
  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    throw new CustomError.UnauthenticatedError(
      "Please make sure you enter a valid email and password"
    );
  }

  if (!user.isVerified) {
    throw new CustomError.UnauthenticatedError(
      "Please first verify your email"
    );
  }

  const tokenUser = createTokenUser(user);

  // create refresh token

  let refreshToken = "";

  // check for existing token

  const existingToken = await Token.findOne({ user: user._id });

  if (existingToken) {
    const { isValid } = existingToken;
    if (!isValid) {
      throw new CustomError.UnauthenticatedError("Invalid Credentials");
    }
    refreshToken = existingToken.refreshToken;
    attachCookiesToResponse({ res, user: tokenUser, refreshToken });

    return res.status(StatusCodes.OK).json({ user: tokenUser });
  }

  refreshToken = crypto.randomBytes(40).toString("hex");

  const userAgent = req.headers["user-agent"];
  const ip = req.ip;
  const userToken = { refreshToken, ip, user: user._id, userAgent };

  await Token.create(userToken);

  // check for existing token

  attachCookiesToResponse({ res, user: tokenUser, refreshToken });

  res.status(StatusCodes.OK).json({ user: tokenUser });
};

const logout = async (req, res) => {
  await Token.findOneAndDelete({ user: req.user.userId });

  res.cookie("accessToken", "logout", {
    httpOnly: true,
    expires: new Date(Date.now()),
  });
  res.cookie("refreshToken", "logout", {
    httpOnly: true,
    expires: new Date(Date.now()),
  });
  res.status(StatusCodes.OK).json({ msg: "user logged out!" });
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new CustomError.BadRequestError("Please provide valid email");
  }
  const user = await User.findOne({ email });

  if (!user)
    throw new CustomError.BadRequestError(
      "No account exists with this email. Please try again."
    );

  const passwordToken = crypto.randomBytes(70).toString("hex");

  const localOrigin = "http://localhost:3000";
  const origin = req.get("origin");

  await sendResetPasswordEmail({
    name: user.name,
    email: user.email,
    token: passwordToken,
    origin,
  });

  // expiration

  const tenMinutes = 1000 * 60 * 10;
  const passwordTokenExpirationDate = new Date(Date.now() + tenMinutes);

  user.passwordToken = createHash(passwordToken);
  user.passwordTokenExpirationDate = passwordTokenExpirationDate;

  await user.save();

  return res
    .status(StatusCodes.OK)
    .json("Please check your email for reset password link");
};

const resetPassword = async (req, res) => {
  const { token, email, password } = req.body;

  console.log(token, email, password);

  if (!token || !email || !password) {
    throw new CustomError.BadRequestError("Please provide all values.");
  }

  const user = await User.findOne({ email });

  if (!user)
    throw new CustomError.BadRequestError(
      "No account exists with this link. Please request reset password link again."
    );

  const currentDate = new Date();

  if (
    user.passwordToken !== createHash(token) ||
    user.passwordTokenExpirationDate <= currentDate
  ) {
    throw new CustomError.BadRequestError(
      "Reset password token is invalid or has expired. Please request reset password link again."
    );
  }

  user.password = password;
  user.passwordToken = null;
  user.passwordTokenExpirationDate = null;
  await user.save();

  res.send("reset password");
};

module.exports = {
  register,
  login,
  logout,
  verifyEmail,
  forgotPassword,
  resetPassword,
};
