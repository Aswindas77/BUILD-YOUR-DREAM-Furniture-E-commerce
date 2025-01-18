const Admin = require("../models/adminModel");
const adminData = require("../models/adminDataModel");


//checking admin logged in or not 

const isLogin= async(req,res,next)=>{
    try{
        if( req.session && req.session.admin){
            next();
        }else{
            res.redirect('/admin/login')
        }
    }
    catch (error){
        console.log(error);
    }
}


 



const verifyAdmin = (req, res, next) => {
    if (req.session && req.session.admin) {
        
        // Check if user is admin
        adminData.findOne({})
            .then(admin => {
                if (admin) {
                    next(); // Proceed if admin
                } else {
                    res.redirect("/admin/login");
                }
            })
            .catch(error => {
                console.log("Error in adminAuth middleware:", error);
                res.status(500).send("Internal Server Error");
            });
    } else {
        res.redirect("/admin/login"); // No session, redirect to login
    }
};


// Checking  admin logged out or not

const isLogout= async(req,res,next)=>{
    try{
        if(req.session.admin){
            res.redirect('/admin/dashboard')
        }else{
            next();
        }
    }
    catch(error){
        console.log(error);
    }
}


module.exports ={isLogin,isLogout,verifyAdmin};
