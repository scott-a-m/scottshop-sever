const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: [true, "Please provide product name"],
      maxlength: [100, "Name cannot be more than 100 characters"],
    },
    price: {
      type: Number,
      required: [true, "Please provide product price"],
      default: 0,
    },
    description: {
      type: String,
      required: [true, "Please provide product description"],
      maxlength: [1000, "Description cannot be more than 1000 characters"],
    },
    image: {
      type: String,
      default: "/uploads/example.jpeg",
    },
    type: {
      type: String,
      required: [true, "Please provide product category"],
      enum: [
        "shorts",
        "shirts",
        "t-shirts",
        "skirts",
        "jackets",
        "coats",
        "jumpers",
        "vests",
        "hats",
        "jeans",
      ],
    },
    sizes: {
      type: [String],
      required: [true, "Please provide size"],
      enum: ["XS", "S", "M", "L", "XL", "XXL"],
    },
    category: {
      type: String,
      required: [true, "Please provide a category of 'mens' or 'womens'"],
      enum: ["mens", "womens"],
    },
    colors: {
      type: [String],
      default: ["#222"],
      required: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    freeDelivery: {
      type: Boolean,
      default: false,
    },
    inventory: {
      type: Number,
      required: true,
      default: 15,
    },
    averageRating: {
      type: Number,
      default: 0,
    },
    numOfReviews: {
      type: Number,
      default: 0,
    },
    user: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

ProductSchema.pre("remove", async function (next) {
  await this.model("Review").deleteMany({ product: this._id });
});

module.exports = mongoose.model("Product", ProductSchema);

// Can set up virtuals to access reviews if needed. But if controller is already set up, can omit this

// { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }

// ProductSchema.virtual("reviews", {
//   ref: "Review",
//   localField: "_id",
//   foreignField: "product",
//   justOne: false,
// });
