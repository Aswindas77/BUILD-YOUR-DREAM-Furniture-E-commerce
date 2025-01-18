const mongoose = require('mongoose');
const bcrypt = require("bcrypt");

const adminDataSchema = new mongoose.Schema({
    email :{
        type:String,
        required:true,
        unique:true,
    },
    password:{
        type:String,
        required:true,
    },
})

adminDataSchema.pre("save",async function (next) {
       if(this.isModified("password")){
        this.password = await bcrypt.hash(this.password,10);
       } 
       next();  
});

const adminDataCollection = mongoose.model("adminData",adminDataSchema);

module.exports = adminDataCollection;