const mongoose = require("mongoose");

const AdminSchema=new mongoose.Schema({
    name: {
        type:String,
        required:true,
    },
    email :{
        type:String,
        required:true,
        unique:true,
    },
    password:{
        type:String,
        required:true,
    },
    profilePic:{
        type:String,
    },
});

const adminCollection = mongoose.model("Admin",AdminSchema,"admin");

module.exports = adminCollection;