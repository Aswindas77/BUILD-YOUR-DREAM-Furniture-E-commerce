const User = require('../models/userModel');




const   isLogin = async (req, res, next) => {
    if (req.session.logged  ) {
        res.redirect('/user')
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
 

const isBan = async(req,res,next)=>{
    try{
        if(req.session?.user?.isblocked===true){
            console.log("logining user=====",req.session.user)
            req.session.destroy()
            next()
        }else{
            next()
        }
    }catch (err) {
        console.log(err.message);
}

}





module.exports = {
    isLogin,
    isLOgut,
    isBan
    
    
};

