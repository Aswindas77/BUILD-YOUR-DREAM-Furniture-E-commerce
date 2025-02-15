const User = require("../models/userModel");
const crypto = require('crypto');
const mongoose = require("mongoose");
const Products = require("../models/productModel");
const Category = require("../models/categoryModel");
const Address = require('../models/addressModel')
const bcrypt = require('bcrypt');
const { Types } = require('mongoose');
const Order = require('../models/ordermodel');
const { log } = require("console");
const { logOut } = require("./userController");







//! load user profile dash

// ====================================================================================================================================================

const userProfile = async (req, res) => {
    try {
        if (!req.session.User) {
            return res.redirect("login");
        }

        const userId = req.session.User._id;
        const user = req.session.User;

        // Fetch and populate orders
        const orders = await Order.find({ userId })
            .populate('items.productId')
            .lean(); // Convert to plain JavaScript object

        // Add totalAmount if missing
        orders.forEach(order => {
            if (!order.totalAmount) {
                order.totalAmount = 0;
            }
        });

        res.render("profile/profileView", { user, orders });

    } catch (error) {
        console.error("Error in userProfile:", error);
        res.status(500).send("Internal Server Error");
    }
};


// ====================================================================================================================================================


//load update profile 

// ====================================================================================================================================================

const loadupdateProfile = async (req, res) => {
    if (req.session.User) {
        const user = req.session.User
        res.render("profile/updateProfile", { user })
    } else {
        res.redirect("login")
    }
}

// ====================================================================================================================================================

//load update profile 

// ====================================================================================================================================================

const updateProfile = async (req, res) => {
    try {
        if (req.session.User) {

            const userId = req.session.User._id;
            console.log(userId);

            const { password, username, email, phone } = req.body;

            const user = await User.findById(userId)



            const existingUser = await User.findOne({ email });

            if (existingUser && existingUser._id.toString() !== userId.toString()) {
                return res.json({ success: false, message: 'this Email already existed ' });
            }

            if (!user) {
                return res.json({ success: false, message: 'User not found' });
            }

            const isMatch = await bcrypt.compare(password, user.password);

            if (isMatch) {
                res.json({ success: true });
                const updateUser = await User.findByIdAndUpdate(
                    userId,
                    { username, email, phone },
                    { new: true }

                )
                req.session.User = updateUser
                await req.session.save()

            } else {
                res.json({ success: false, message: 'Incorrect password' });
            }

        }
    } catch (error) {
        console.log(error.message)
    }
}

// ====================================================================================================================================================



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


        const activeAddresses = userAddresses.address.filter(addr => addr.isDeleted === false);

        console.log("Active Addresses:", activeAddresses);

        res.render("profile/profileAddress", { addresses: activeAddresses });


    } catch (error) {
        console.error(error.message)
    }
}

// ====================================================================================================================================================

//load load user Address

//  ====================================================================================================================================================

const loadAddAddress = async (req, res) => {
    if (req.session.User) {
        console.log("User data in sesion", req.session)
        res.render("profile/addAddress")
    } else {
        res.redirect("login")
    }
}

// ====================================================================================================================================================


//load load user Address

// ====================================================================================================================================================

const addAddress = async (req, res) => {
    try {
        const addressData = req.body;
        console.log("Request Body:", addressData);

        const user = req.session?.User;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized. Please log in." });
        }
        console.log("Address User Data:", user);

        const { houseNumber, landmark, city, country, pincode, phone } = addressData;

        if (!houseNumber || !landmark || !city || !country || !pincode || !phone) {
            return res.status(400).json({ success: false, message: "All fields are required." });
        }

        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({ success: false, message: "Invalid phone number format." });
        }

        const pincodeRegex = /^\d{6}$/;
        if (!pincodeRegex.test(pincode)) {
            return res.status(400).json({ success: false, message: "Invalid pincode format. Must be 6 digits." });
        }

        let address = await Address.findOne({ userId: user._id });


        const newAddress = { houseNumber, landmark, city, country, pincode, phone, isDeleted: false };

        if (!address) {
            address = new Address({
                userId: user._id,
                address: [newAddress],
            });
        } else {
            address.address.push(newAddress);
        }

        console.log("Address to be saved:", address);


        await address.save();
        console.log("Address Saved:", address);

        return res.status(201).json({ success: true, message: "Address added successfully!", address });
    } catch (error) {
        console.error("Error Adding Address:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const loadEditAddress = async (req, res) => {
    try {
        const addressId = req.query.id;



        if (!mongoose.Types.ObjectId.isValid(addressId)) {
            return res.status(400).send("Invalid Address ID");
        }

        const userAddress = await Address.findOne({ "address._id": addressId });



        if (!userAddress) {
            return res.status(404).send("Address not found");
        }


        const address = userAddress.address.find(addr => addr._id.toString() === addressId);

        if (!address) {
            return res.status(404).send("Address not found inside document");
        }



        res.render('profile/editAddress', { address });

    } catch (error) {
        console.error(error);
        res.status(500).send("Error loading edit address page");
    }
}



//  ====================================================================================================================================================

// update address
const updateAddress = async (req, res) => {
    try {
        const { addressId, houseNumber, city, landmark, country, pincode, phone } = req.body;
        const { _id } = req.session.User._id
        const userId = _id

        const userAddress = await Address.findOne({ "address._id": addressId });

        const errors = [];
        if (!/^[6-9]\d{9}$/.test(phone)) {
            return res.status(404).json('Invalid phone number format');
        }
        const existingPhone = await Address.findOne({
            user: userId,
            phone: phone,
            _id: { $ne: addressId }
        });
        if (existingPhone) {
            return res.status(404).send('Phone number already exists in your addresses');
        }
        if (!userAddress) {
            return res.status(404).json("Address not found");
        }

        // Find the specific address inside the array
        const addressToUpdate = userAddress.address.find(addr => addr._id.toString() === addressId);

        if (!addressToUpdate) {
            return res.status(404).json("Address not found in user document");
        }

        // Update the fields
        addressToUpdate.houseNumber = houseNumber;
        addressToUpdate.city = city;
        addressToUpdate.landmark = landmark;
        addressToUpdate.country = country;
        addressToUpdate.pincode = pincode;
        addressToUpdate.phone = phone;

        // Save the updated document
        await userAddress.save();

        console.log("Updated Address:", addressToUpdate);
        res.redirect('/user/useraddress');
    } catch (error) {
        console.error('Error updating address:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
}

//  delete address

const deleteAddress = async (req, res) => {
    try {
        const addressId = req.query.id;
        const { _id } = req.session.User
        const userId = new mongoose.Types.ObjectId(_id);



        if (!addressId) {
            return res.status(400).json({ error: "Address ID is required." });
        }

        const result = await Address.findOneAndUpdate(
            { userId: userId, "address._id": addressId },
            { $set: { "address.$.isDeleted": true } },
            { new: true }
        );

        console.log("blaaa", result);

        if (!result) {
            return res.status(404).json({ error: "Address not found." });
        }

        // 3. Send success response
        res.status(200).json({ message: "Address deleted successfully." });
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).json({ error: "Failed to delete address." });
    }
}

const loadChangePassword = async (req, res) => {
    try {
        if (req.session.User) {
            res.render('profile/changePassword');
        } else {
            res.redirect('/user/login');
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const updatePassword = async (req, res) => {
    try {
        if (!req.session.User) {
            return res.status(401).json({ success: false, message: 'Please login first' });
        }

        const { currentPassword, newPassword, confirmPassword } = req.body;
        const userId = req.session.User._id;

        // Validate password match
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'New passwords do not match' });
        }

        // Password strength validation
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long and contain at least one letter, one number, and one special character'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        user.password = hashedPassword;
        await user.save();

        res.status(200).json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// order controller

const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const userId = req.session.User._id;

        // Fetch order with populated data
        const order = await Order.findOne({ _id: orderId, userId })
            .populate('items.productId')
            .populate('billingAddress')
            .lean();

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Calculate total amount if it's undefined
        if (!order.totalAmount) {
            order.totalAmount = order.items.reduce((total, item) => {
                return total + (item.price * item.quantity);
            }, 0);
        }

        // Add order timeline/tracking data
        const orderTimeline = [];
        const progressPercentage =
            order.status === 'Delivered' ? 100 :
                order.status === 'Shipped' ? 66 :
                    order.status === 'Processing' ? 33 : 0;

        // Format the order data with safe defaults
        const formattedOrder = {
            _id: order._id,
            status: order.status || 'Pending',
            createdAt: new Date(order.createdAt).toLocaleString('en-US', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            items: order.items.map(item => ({
                productId: {
                    name: item.productId?.name || 'Product Name Not Available',
                    images: item.productId?.images || []
                },
                quantity: item.quantity || 0,
                price: item.price || 0
            })),
            billingAddress: order.billingAddress || {},
            paymentMethod: order.paymentMethod || 'Not Specified',
            paymentStatus: order.paymentStatus || 'Pending',
            totalAmount: order.totalAmount || 0,
            discount: order.discount || 0,
            progress: progressPercentage,
            timeline: orderTimeline
        };

        console.log('Formatted Order:', formattedOrder); // For debugging

        // Render the order details page
        res.render('user/profile/orderDetails', {
            order: formattedOrder,
            user: req.session.User
        });

    } catch (error) {
        console.error('Error in getOrderDetails:', error);
        res.status(500).send('Error loading order details');
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

}

