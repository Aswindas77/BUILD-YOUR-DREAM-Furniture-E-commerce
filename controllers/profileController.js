const User = require("../models/userModel");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Products = require("../models/productModel");
const Category = require("../models/categoryModel");
const Address = require("../models/addressModel");
const Coupon = require("../models/couponModel");
const bcrypt = require("bcrypt");
const { Types } = require("mongoose");
const Order = require("../models/ordermodel");
const { log } = require("console");
const { logOut } = require("./userController");
const Wallet = require("../models/walletModel");
const Return = require("../models/returnModel");
const HttpStatus = require("../constants/httpStatus");
const Messages = require("../constants/messages.json");

// load user profile

// ====================================================================================================================================================

const userProfile = async (req, res) => {
  try {
    if (!req.session.User) {
      return res.redirect("login");
    }
    const { search = "", page = 1 } = req.query;
    const userId = req.session.User._id;
    const user = req.session.User;
    const limit = 2;
    const skip = (page - 1) * limit;

    const totalOrders = await Order.countDocuments({ userId });
    const totalPages = Math.ceil(totalOrders / limit);

    const orders = await Order.find({ userId })
      .populate("items.productId")
      .lean()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const WalletBalance = await Wallet.findOne({ userId: userId });

    const userAddress = await Address.findOne({ userId: userId }).lean();

    const activeOrders = await Order.find({
      userId: userId,
      status: { $nin: ["Delivered", "Cancelled"] },
    }).lean();

    orders.forEach((order) => {
      if (!order.totalAmount) {
        order.totalAmount = order.totalAmount || 0;
      }
    });

    res.render("profile/profileView", {
      user,
      orders,
      totalOrders,
      activeOrders,
      currentPage: parseInt(page),
      totalPages,
      walletBalance: WalletBalance ? WalletBalance.balance || 0 : 0,
      userAddress: userAddress ? userAddress?.address?.length || 0 : 0,
    });
  } catch (error) {
    console.error("Error in userProfile:", error);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: Messages.INTERNAL_ERROR });
  }
};

//load update profile

// ====================================================================================================================================================

const loadupdateProfile = async (req, res) => {
  if (req.session.User) {
    const user = req.session.User;
    res.render("profile/updateProfile", { user });
  } else {
    res.redirect("login");
  }
};

//load update profile

// ====================================================================================================================================================

const updateProfile = async (req, res) => {
  try {
    if (req.session.User) {
      const userId = req.session.User._id;
      console.log(userId);

      const { password, username, email, phone } = req.body;

      const user = await User.findById(userId);

      const existingUser = await User.findOne({ email });

      if (existingUser && existingUser._id.toString() !== userId.toString()) {
        return res.json({
          success: false,
          message: "this Email already existed ",
        });
      }

      if (!user) {
        return res.json({ success: false, message: "User not found" });
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (isMatch) {
        res.json({ success: true });
        const updateUser = await User.findByIdAndUpdate(
          userId,
          { username, email, phone },
          { new: true }
        );
        req.session.User = updateUser;
        await req.session.save();
      } else {
        res.json({ success: false, message: "Incorrect password" });
      }
    }
  } catch (error) {
    console.log(error.message);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: Messages.INTERNAL_ERROR });
  }
};

//load load user Address

// ====================================================================================================================================================

const loaduserAddress = async (req, res) => {
  try {
    if (!req.session.User) {
      return res.redirect("login");
    }

    const { _id } = req.session.User;
    console.log("User ID:", _id);

    const userId = new mongoose.Types.ObjectId(_id);

    const userAddresses = await Address.findOne(
      { userId: userId },
      { address: 1 }
    ).populate("userId");

    if (!userAddresses || !userAddresses.address.length) {
      console.log("No addresses found for this user.");
      return res.render("profile/profileAddress", { addresses: [] });
    }

    const activeAddresses = userAddresses.address.filter(
      (addr) => addr.isDeleted === false
    );

    console.log("Active Addresses:", activeAddresses);

    res.render("profile/profileAddress", { addresses: activeAddresses });
  } catch (error) {
    console.error(error.message);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: Messages.INTERNAL_ERROR });
  }
};

//load add Address

//  ====================================================================================================================================================

const loadAddAddress = async (req, res) => {
  if (req.session.User) {
    console.log("User data in sesion", req.session);
    res.render("profile/addAddress");
  } else {
    res.redirect("login");
  }
};

//load load user Address

// ====================================================================================================================================================

const addAddress = async (req, res) => {
  try {
    const addressData = req.body;
    console.log("Request Body:", addressData);

    const user = req.session?.User;
    if (!user) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ success: false, message: Messages.UNAUTHORIZED_ACCESS });
    }
    console.log("Address User Data:", user);

    const { houseNumber, landmark, city, country, pincode, phone } =
      addressData;

    if (!houseNumber || !landmark || !city || !country || !pincode || !phone) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ success: false, message: "All fields are required." });
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ success: false, message: "Invalid phone number format." });
    }

    const pincodeRegex = /^\d{6}$/;
    if (!pincodeRegex.test(pincode)) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({
          success: false,
          message: "Invalid pincode format. Must be 6 digits.",
        });
    }

    let address = await Address.findOne({ userId: user._id });

    const newAddress = {
      houseNumber,
      landmark,
      city,
      country,
      pincode,
      phone,
      isDeleted: false,
    };

    if (!address) {
      address = new Address({
        userId: user._id,
        address: [newAddress],
      });
    } else {
      address.address.push(newAddress);
    }

    await address.save();
    console.log("Address Saved:", address);

    return res
      .status(HttpStatus.CREATED)
      .json({ success: true, message: "Address added successfully!", address });
  } catch (error) {
    console.error("Error Adding Address:", error);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: Messages.INTERNAL_ERROR });
  }
};

// load edit address

//====================================================================================================================================================

const loadEditAddress = async (req, res) => {
  try {
    const addressId = req.query.id;

    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      return res.status(HttpStatus.BAD_REQUEST).send("Invalid Address ID");
    }

    const userAddress = await Address.findOne({ "address._id": addressId });

    if (!userAddress) {
      return res.status(HttpStatus.NOT_FOUND).send("Address not found");
    }

    const address = userAddress.address.find(
      (addr) => addr._id.toString() === addressId
    );

    if (!address) {
      return res
        .status(HttpStatus.NOT_FOUND)
        .send("Address not found inside document");
    }

    res.render("profile/editAddress", { address });
  } catch (error) {
    console.error(error);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: Messages.INTERNAL_ERROR });
  }
};

// update address

//====================================================================================================================================================

const updateAddress = async (req, res) => {
  try {
    const { addressId, houseNumber, city, landmark, country, pincode, phone } =
      req.body;
    const { _id } = req.session.User._id;
    const userId = _id;

    console.log("addressId", addressId);

    const userAddress = await Address.findOne({ "address._id": addressId });

    console.log("user address", userAddress);

    const errors = [];
    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res
        .status(HttpStatus.NOT_FOUND)
        .json("Invalid phone number format");
    }
    const existingPhone = await Address.findOne({
      user: userId,
      phone: phone,
      _id: { $ne: addressId },
    });
    console.log("existing phone", existingPhone);

    if (existingPhone) {
      return res
        .status(HttpStatus.NOT_FOUND)
        .send("Phone number already exists in your addresses");
    }
    if (!userAddress) {
      return res.status(HttpStatus.NOT_FOUND).json("Address not found");
    }

    const addressToUpdate = userAddress.address.find(
      (addr) => addr._id.toString() === addressId
    );

    if (!addressToUpdate) {
      return res
        .status(HttpStatus.NOT_FOUND)
        .json("Address not found in user document");
    }

    addressToUpdate.houseNumber = houseNumber;
    addressToUpdate.city = city;
    addressToUpdate.landmark = landmark;
    addressToUpdate.country = country;
    addressToUpdate.pincode = pincode;
    addressToUpdate.phone = phone;

    await userAddress.save();

    res.status(HttpStatus.OK).json({
      success: true,
      message: "Address updated successfully!",
    });
  } catch (error) {
    console.error("Error updating address:", error);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: Messages.INTERNAL_ERROR });
  }
};

//  delete address

//====================================================================================================================================================

const deleteAddress = async (req, res) => {
  try {
    const addressId = req.query.id;
    const { _id } = req.session.User;
    const userId = new mongoose.Types.ObjectId(_id);

    if (!addressId) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ error: "Address ID is required." });
    }

    const result = await Address.findOneAndUpdate(
      { userId: userId, "address._id": addressId },
      { $set: { "address.$.isDeleted": true } },
      { new: true }
    );

    console.log("blaaa", result);

    if (!result) {
      return res
        .status(HttpStatus.NOT_FOUND)
        .json({ error: "Address not found." });
    }

    res
      .status(HttpStatus.OK)
      .json({ message: "Address deleted successfully." });
  } catch (error) {
    console.error("Server error:", error);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: Messages.INTERNAL_ERROR });
  }
};

// load channge password

//====================================================================================================================================================

const loadChangePassword = async (req, res) => {
  try {
    if (req.session.User) {
      res.render("profile/changePassword");
    } else {
      res.redirect("/user/login");
    }
  } catch (error) {
    console.log(error.message);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: Messages.INTERNAL_ERROR });
  }
};

// update password

//====================================================================================================================================================

const updatePassword = async (req, res) => {
  try {
    if (!req.session.User) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ success: false, message: "Please login first" });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.session.User._id;

    console.log("currentPass", currentPassword);
    console.log("newpass", newPassword);
    console.log("currentPass", confirmPassword);

    if (newPassword !== confirmPassword) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ success: false, message: "New passwords do not match" });
    }

    const passwordRegex =
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message:
          "Password must be at least 8 characters long and contain at least one letter, one number, and one special character",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(HttpStatus.NOT_FOUND)
        .json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ success: false, message: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    await user.save();

    res
      .status(HttpStatus.OK)
      .json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.log(error.message);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: Messages.INTERNAL_ERROR });
  }
};

// get order details

//====================================================================================================================================================

const getOrderDetails = async (req, res) => {
  try {
    if (!req.session.User) {
      return res.redirect("/user/login");
    }
    const orderId = req.params?.orderId;
    const userId = req.session.User?._id;

    const order = await Order.findById(orderId).populate("items.productId");

    const codeCoupon = order?.couponCode;

    const coupon = await Coupon.findOne({ code: codeCoupon });

    let couponPercentage = coupon?.discountPercentage || null;

    let discountAmount = null;
    if (coupon) {
      discountAmount = (couponPercentage / 100) * order?.totalAmount;
      discountAmount = Number(discountAmount.toFixed(2));
    }

    console.log("discount Amount", discountAmount);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    let selectedAddress = null;
    if (order.addressId) {
      const userAddress = await Address.findOne(
        { "address._id": order.addressId },
        { "address.$": 1 }
      );
      if (userAddress && userAddress.address.length > 0) {
        selectedAddress = userAddress.address[0];
      }
    }

    if (!order.totalAmount) {
      order.totalAmount = order.items.reduce((total, item) => {
        return total + item.price * item.quantity;
      }, 0);
    }

    const orderTimeline = [];
    const progressPercentage =
      order.status === "Delivered"
        ? 100
        : order.status === "Shipped"
        ? 66
        : order.status === "Processing"
        ? 33
        : 0;

    const returnRequest = await Return.findOne({ orderId, userId }).lean();

    console.log("noo", returnRequest);

    const formattedOrder = {
      _id: order._id,
      status: order.status || "Pending",
      createdAt: new Date(order.createdAt).toLocaleString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      items: order.items.map((item) => ({
        productId: {
          name: item.productId?.name || "Product Name Not Available",
          images: item.productId?.images || [],
        },
        quantity: item.quantity || 0,
        price: item.price || 0,
      })),

      paymentMethod: order.paymentMethod || "Not Specified",
      paymentStatus: order.paymentStatus || "Pending",
      totalAmount: order.totalAmount || 0,
      discount: order.discount || 0,
      progress: progressPercentage,
      timeline: orderTimeline,
      returnRequest,
    };

    res.render("profile/orderDetails", {
      order: formattedOrder,
      subTotal: order.subTotal,
      discountAmount: discountAmount,
      coupon: coupon,
      returnOrder: returnRequest,
      user: req.session?.User,
      selectedAddress,
    });
  } catch (error) {
    console.error("Error in getOrderDetails:", error);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: Messages.INTERNAL_ERROR });
  }
};

module.exports = {
  userProfile,
  loadupdateProfile,
  updateProfile,
  loaduserAddress,
  loadAddAddress,
  addAddress,
  loadEditAddress,
  updateAddress,
  deleteAddress,
  loadChangePassword,
  updatePassword,
  getOrderDetails,
};
