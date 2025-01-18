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
    offerPrice:{
        type:Number,
        default:0
    },
    createdAt:{
        type:Date,
        defult:Date.now
    },
    isDeleted: {
        type: Boolean,
        default: false,
      },
})

const Category=mongoose.model("Category",categorySchema)
module.exports=Category