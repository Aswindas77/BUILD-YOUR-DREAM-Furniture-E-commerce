const mongoose = require('mongoose')
const {Schema} = mongoose


const addresssSchema = new Schema({
    userId :{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    address:[{
        houseNumber: {
            type: String,
            required: [true, 'House name/number is required'], 
            trim: true
        },
        city:{
            type:String,
            required:true,
        },
        landmark:{

            type:String,
            
        },
        country:{
            type:String,
            required:true,
        },
        pincode:{
            type:Number,
            required:true
        },
        phone:{
            type:String,
            required:true
        },
        isDeleted: {
            type: Boolean,
            default: false,
        }

    }]
})


const Address = mongoose.model('Address',addresssSchema)

module.exports=Address