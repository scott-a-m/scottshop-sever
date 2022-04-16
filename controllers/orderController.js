const Order = require("../models/Order");
const Product = require("../models/Product");
const stripe = require("stripe")(process.env.STRIPE_SECRET);

const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");
const checkPermissions = require("../utils/checkPermissions");

const getAllOrders = async (req, res) => {
  const orders = await Order.find({});
  res.status(StatusCodes.OK).json({ orders, count: orders.length });
};

const getSingleOrder = async (req, res) => {
  const { id: orderId } = req.params;

  const order = await Order.findOne({ _id: orderId });

  if (!order) {
    throw new CustomError.NotFoundError(
      "No orders exists with the id:",
      orderId
    );
  }

  checkPermissions(req.user, order.user);

  res.status(StatusCodes.OK).json({ order });
};

const getCurrentUserOrders = async (req, res) => {
  const userOrders = await Order.find({ user: req.user.userId });

  if (!userOrders) {
    throw new CustomError.NotFoundError("No orders exist.");
  }

  res.status(StatusCodes.OK).json({ userOrders, count: userOrders.length });
};

const createOrder = async (req, res) => {
  const { basket: basketItems, deliveryFee } = req.body;
  if (!basketItems || basketItems.length < 1) {
    throw new CustomError.BadRequestError("No basket items provided");
  }

  if (!deliveryFee) {
    throw new CustomError.BadRequestError("Please provide delivery fee");
  }

  let orderItems = [];
  let subtotal = 0;

  for (const item of basketItems) {
    const dbProduct = await Product.findOne({ _id: item.productId });
    if (!dbProduct) {
      throw new CustomError.NotFoundError(
        `No product with id: ${item.product} exists.`
      );
    }
    const { name, price, image, _id } = dbProduct;
    const { color, size, id: fullItemId } = item;

    const singleOrderItem = {
      amount: item.amount,
      name,
      price,
      image,
      product: _id,
      fullItemId,
      color,
      size,
    };

    // add items to order array

    orderItems = [...orderItems, singleOrderItem];

    // calc subtotal

    subtotal += price * item.amount;
  }

  const total = subtotal + deliveryFee;

  // get client secret

  const paymentIntent = await stripe.paymentIntents.create({
    amount: total,
    currency: "gbp",
  });

  const order = await Order.create({
    orderItems,
    total,
    subtotal,
    deliveryFee,
    clientSecret: paymentIntent.client_secret,
    user: req.user.userId,
  });

  res
    .status(StatusCodes.CREATED)
    .json({ order, clientSecret: order.clientSecret });
};

const updateOrder = async (req, res) => {
  const { id: orderId } = req.params;

  const order = await Order.findOne({ _id: orderId });

  if (!order) {
    throw new CustomError.NotFoundError(
      "No orders exists with the id:",
      orderId
    );
  }

  checkPermissions(req.user, order.user);

  const { cancelOrder } = req.body;

  if (cancelOrder) {
    order.status = "cancelled";
    await order.save();
    return res.status(StatusCodes.OK).json({ order });
  }

  const { paymentIntentId } = req.body;

  order.paymentIntentId = paymentIntentId;
  order.status = "paid";
  await order.save();

  res.status(StatusCodes.OK).json({ order });
};

module.exports = {
  getAllOrders,
  getSingleOrder,
  getCurrentUserOrders,
  createOrder,
  updateOrder,
};
