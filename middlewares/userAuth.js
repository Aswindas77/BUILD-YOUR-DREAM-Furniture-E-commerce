const User = require('../models/userModel');




const   isLogin = async (req, res, next) => {
    if (req.session && req.session.user) {
        res.redirect('/user/home')
    } else {
        next()
        
    }
};
 

// checking if user logged out or not
const isLOgut = async (req, res, next) => {
    try {
        if (!req.session.user) {
            next();
        } else {
            res.redirect("/home");
        }
    } catch (err) {
        console.log(err.message);
    }
};
 

const checkUserSession = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/user/login'); 
    }
    next(); 
};






module.exports = {
    isLogin,
    isLOgut,
    checkUserSession,
    
};

