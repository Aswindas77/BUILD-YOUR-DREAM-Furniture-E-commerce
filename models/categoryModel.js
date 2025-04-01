const { min } = require("moment")
const mongoose=require("mongoose")


const categorySchema=new mongoose.Schema({
    name:{
        type:String,
        required:true,
        unique:true  
    },
    description:{
        type:String,
        required:true
    },
    status:{
        type:String,
        default:true
    },
    offerPercentage:{
        type:Number,
        min:0
    },
    minimumPrice: {
        type: Number,
        min: 0,
        required: true  
    },
    claimableAmount: {
        type: Number,
        min: 0,
        required: true  
    },
    createdAt:{
        type:Date,
        defult:Date.now
    },
    isDeleted: {
        type: Boolean, 
        default: false,
      },
      isListed:{
        type:Boolean,
        default:false
      }
})

const Category=mongoose.model("Category",categorySchema)
module.exports=Category