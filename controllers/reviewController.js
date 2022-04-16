const Review = require("../models/Review");
const Product = require("../models/Product");
const Order = require("../models/Order");

const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");

const checkPermissions = require("../utils/checkPermissions");

const createReview = async (req, res) => {
  const { product: productId } = req.body;
  const user = req.user.userId;
  req.body.user = user;

  const product = await Product.findOne({ _id: productId });

  if (!product) {
    throw new CustomError.NotFoundError(
      `No product with the Id: ${productId} exists.`
    );
  }

  req.body.image = product.image;

  const order = await Order.find({ user });

  if (!order) {
    throw new CustomError.NotFoundError(
      `You must first purchase this product before writing a review.`
    );
  }

  const hasProductBeenPurchased = order.filter((item) => {
    if (item.status === "paid") {
      return item.orderItems.find((item) => {
        const prodId = item.product.toString();
        return prodId === productId;
      });
    }
    return null;
  });

  if (hasProductBeenPurchased.length < 1) {
    throw new CustomError.NotFoundError(
      `You must first purchase this product before writing a review.`
    );
  }

  const alreadySubmitted = await Review.findOne({
    product: productId,
    user,
  });

  if (alreadySubmitted) {
    throw new CustomError.BadRequestError(
      "You have aready submitted a review for this product"
    );
  }

  const review = await Review.create(req.body);

  res.status(StatusCodes.CREATED).json({ review });
};

const getAllReviews = async (req, res) => {
  const reviews = await Review.find({})
    .populate({
      path: "product",
      select: "name company price",
    })
    .populate({
      path: "user",
      select: "name",
    });

  res.status(StatusCodes.CREATED).json({ reviews, count: reviews.length });
};
const getAllUserReviews = async (req, res) => {
  const reviews = await Review.find({ user: req.user.userId })
    .populate({
      path: "product",
      select: "name company price",
    })
    .populate({
      path: "user",
      select: "name",
    });

  if (!reviews) {
    throw new CustomError.NotFoundError("You have no made any reviews yet.");
  }

  res.status(StatusCodes.CREATED).json({ reviews, count: reviews.length });
};

const getSingleReview = async (req, res) => {
  const { id: reviewId } = req.params;

  const review = await Review.findOne({ _id: reviewId });

  if (!review) {
    throw new CustomError.NotFoundError(
      `No review exists with this id (${reviewId})`
    );
  }

  res.status(StatusCodes.CREATED).json({ review });
};

const updateReview = async (req, res) => {
  const { id: reviewId } = req.params;

  const { comment, title, rating } = req.body;

  const review = await Review.findOne({
    _id: reviewId,
  });

  if (!review) {
    throw new CustomError.NotFoundError(
      `No review with this id (${reviewId}) exists.`
    );
  }

  checkPermissions(req.user, review.user);

  review.comment = comment;
  review.title = title;
  review.rating = rating;

  await review.save();

  res.status(StatusCodes.OK).json({ review });
};

const deleteReview = async (req, res) => {
  const { id: reviewId } = req.params;

  const review = await Review.findOne({
    _id: reviewId,
  });

  if (!review) {
    throw new CustomError.NotFoundError(
      `No review with this id (${reviewId}) exists.`
    );
  }

  checkPermissions(req.user, review.user);

  await review.remove();

  res.status(StatusCodes.OK).json({ msg: "review deleted" });
};

const getSingleProductReviews = async (req, res) => {
  const { id: productId } = req.params;
  const reviews = await Review.find({ product: productId });
  res.status(StatusCodes.OK).json({ reviews, count: reviews.length });
};

module.exports = {
  createReview,
  getAllReviews,
  getAllUserReviews,
  getSingleReview,
  updateReview,
  deleteReview,
  getSingleProductReviews,
};
