const Admin = require('../models/adminModel');
const adminData = require("../models/adminDataModel");
const userData = require('../models/userModel');
const bcrypt = require("bcrypt");
const mongoose = require('mongoose');
const saltRounds = 10;







// =================  admin verification =================================



// login page load // verify admin

//====================================================================================================================================================

const loadLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    res.render("adminLogin", { emailError: "", passwordError: "" , layout:false});
  } catch (err) {
    console.log(err.message);
  }
};
 
//====================================================================================================================================================


//====================================================================================================================================================


// load dashboad

//====================================================================================================================================================

const loadDash = async (req, res) => {
  try {
    const { email, password } = req.body;



    const admin = await adminData.findOne({ email: email });
    if (!admin) {
      return res.status(400).json({ emailError: "Admin not found!" });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ passwordError: "Invalid password!" });
    }

    // Success - Set session and respond
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

const loadusermanagment = async (req,res) =>{
  try{

    let users= await userData.find({})
    
    

    res.render("userManagement",{users});
  }catch (err) {
    console.error("Error in loadusermanagment:", err.message);
    res.status(500).send("Server error");
  }
}

//====================================================================================================================================================


// load user block 

//====================================================================================================================================================

const blockUser = async (req,res)=>{
  try{
    const id=req.params.userId;

    console.log("Route hit:", id); 
   
    
    if(!mongoose.Types.ObjectId.isValid(id)){
      console.log("Invalid userID: ",id);
      return res.status(400).send("invalid user Id");
    }
       
   const result = await userData.updateOne({_id:id},{$set:{isBlocked:true}});

   console.log("updated result:",result)

   if(result.matchedCount===0){

    return res.status(404).send("user not found or already blocked");
   }

   res.redirect("/admin/user-management")

  }catch(err){
    console.error("Error in blockUser:",err.message)
    res.status(500).send("Server error");
  }
}


//====================================================================================================================================================




// user block

const toggleUserAccess = async (req, res) => {
  try {
      const userId = req.params.userId;
      const action = req.params.action;

      console.log("Toggle access request:", { userId, action });

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        console.log("Invalid userId:", userId);
          return res.status(400).json({
              success: false,
              message: "Invalid user ID"
          });
      }

      const isBlocked = action === 'block';
      
      const result = await userData.updateOne(
          { _id: userId },
          { $set: { isBlocked } }
      );

      console.log("Update result:", result);

      // Send JSON response instead of redirect
      if (result.matchedCount === 0) {
        return res.status(404).json({
            success: false,
            message: "User not found"
        });
    }

    // Send success response
    return res.status(200).json({
      success: true,
      message: `User ${action}ed successfully`,
      isBlocked: isBlocked
  });

  } catch (err) {
      console.error("Error in toggleUserAccess:", err);
      return res.status(500).json({
          success: false,
          message: "Server error"
      });
  }
};









// logout page

//====================================================================================================================================================

const logout = async (req, res) => {
  try {
    req.session.admin=null
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
  // blockUser,
  // unBlockUser,
  logout,

  toggleUserAccess,
  
};