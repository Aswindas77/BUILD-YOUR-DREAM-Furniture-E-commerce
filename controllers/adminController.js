const adminData = require("../models/adminDataModel");
const userData = require('../models/userModel');
const bcrypt = require("bcrypt");
const mongoose = require('mongoose');








// =================  admin verification =================================



// login page load // verify admin


//====================================================================================================================================================

const loadLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    res.render("adminLogin", { emailError: "", passwordError: "", layout: false });
  } catch (err) {
    console.log(err.message);
  }
};

// load dashboad

//====================================================================================================================================================

const loadDash = async (req, res) => {
  try {
    const { email, password } = req.body;



    const admin = await adminData.findOne({ email: email });
    if (!admin) {
      return res.status(400).json({ emailError: "Admin not found!" });
    }


    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ passwordError: "Invalid password!" });
    }


    req.session.admin = admin;
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

//====================================================================================================================================================

// load dashboard

//====================================================================================================================================================

const dashboad = async (req, res) => {
  try {
    res.render("adminDashboard")
  } catch (err) {
    console.error(err.message)
  }
}

// ====================================================================================================================================================


//  load user management

//====================================================================================================================================================

const loadusermanagment = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const skip = (page - 1) * limit;

    const totalUsers = await userData.countDocuments();


    let users = await userData.find({}).skip(skip).limit(limit);


    const totalPages = Math.ceil(totalUsers / limit);



    res.render("userManagement", {
      users,
      currentPage: page,
      totalPages,

    });
  } catch (err) {
    console.error("Error in loadusermanagment:", err.message);
    res.status(500).send("Server error");
  }
}

//====================================================================================================================================================

// user block

//====================================================================================================================================================

const toggleBlockAccess = async (req, res) => {
  try {
    const { userId, action } = req.params;

    console.log("Toggle access request:", { userId, action });

    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log("Invalid userId:", userId);
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    // Validate action
    if (!["block", "unblock"].includes(action)) {
      console.log("Invalid action:", action);
      return res.status(400).json({
        success: false,
        message: "Invalid action. Use 'block' or 'unblock'."
      });
    }

    const isBlocked = action === 'block';

    // Update user and get updated document
    const updatedUser = await userData.findByIdAndUpdate(
      userId,
      { isBlocked },
      { new: true, runValidators: true }
    );
    req.session.user

    // Check if user exists
    if (!updatedUser) {
      console.log("User not found in database for ID:", userId);
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    console.log("User updated successfully:", updatedUser);

    // Send success response
    return res.status(200).json({
      success: true,
      message: `User ${action}ed successfully`,
      isBlocked: updatedUser.isBlocked
    });

  } catch (err) {
    console.error("Error in toggleUserAccess:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while updating user status"
    });
  }
};

// logout page

//====================================================================================================================================================

const logout = async (req, res) => {
  try {
    req.session.admin = null
    res.redirect("/admin/login");
  } catch (err) {
    console.log(err)
  }
}

//====================================================================================================================================================



module.exports = {
  loadLogin,
  loadDash,
  dashboad,
  loadusermanagment,
  logout,
  toggleBlockAccess,
  

};