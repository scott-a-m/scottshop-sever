const express = require("express");
const router = express.Router();

const { authenticateUser } = require("../middleware/authentication");

const {
  createReview,
  getAllReviews,
  getSingleReview,
  updateReview,
  deleteReview,
  getAllUserReviews,
} = require("../controllers/reviewController");

router.route("/").post(authenticateUser, createReview).get(getAllReviews);

router.route("/user").get(authenticateUser, getAllUserReviews);

router
  .route("/:id")
  .patch(authenticateUser, updateReview)
  .delete(authenticateUser, deleteReview)
  .get(getSingleReview);

module.exports = router;
