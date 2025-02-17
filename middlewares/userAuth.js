const User = require('../models/userModel');




const   isLogin = async (req, res, next) => {
    if (req.session.logged ) {
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

       
        if(req.session?.User){
            
            const email =req.session?.User?.email

            const user =await User.findOne({email})

            console.log("aswinnnn====",user)

            if(user.isBlocked===true){
                req.session.destroy()
                next()
            }else{
                next()
            }
           
            
        }else{
            next()
        }
    }catch (err) {
        console.log(err.message);
}

}

const payment = async(req,res,next) =>{

    try {
        const {cartid} =req.body
    console.log("card id middle",cartid)
      
    if(!cartid){
        res.redirect('/user/')
    }
    else{
        next()
    }
    } catch (error) {
        console.log(error.message)
    }

}





module.exports = {
    isLogin,
    isLOgut,
    isBan,
    payment,
    
    
};

