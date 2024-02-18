const mongoose = require("mongoose");
const validator = require("validator")
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv")
const crypto=require("crypto")
dotenv.config({path:"./config/config.env"})
const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:[true,"Please Enter Your Name"],
        minLength:[4,"Name cannot exceed 4 characters"],
        maxLength:[30,"Name should have more than 30 characters"]
    },
    email:{
        type:String,
        required:[true,"Please Enter Your Email"],
        validate:[validator.isEmail,"Please Enter a valid Email"]
        },
        password:{
            type:String,
            required:[true,"Please Enter Your password"],
            minLength:[8,"Password should greater than 8 characters"],
            select:false
        },
        avatar:{
            public_id:{
                type:String,
                required:true
            },
            url:{
                type:String,
                required:true
            }
        },
        user: {
            type: mongoose.Schema.ObjectId,
            ref: "User",
            required: true,
           // refPath: '_userId' // Example assuming _id is named '_userId'
          },
        role:{
            type:String,
            default:"user"
        },
        createdAt:{
        type:Date,
        default:Date.now()
        },
        resetpasswordToken:String,
        resetPasswordExpire:Date,


    }
)
userSchema.pre("save",async function(next){
    if(!this.isModified("password")){
        next();
    }
    this.password =await bcryptjs.hash(this.password,10);
    next()
})
//jwt token 
userSchema.methods.getJWTToken =  function(){
    return jwt.sign({id:this._id},"bcesudghwuetq27swsbxcjhh7ewdqwudnwkuyyd",{
        expiresIn:process.env.EXPIRE_TIME
    })
}
userSchema.methods.comparePassword = async function(enterpassword){
    return await bcryptjs.compare(enterpassword,this.password);
}
//generate Password Reset Token
userSchema.methods.getResetPassword =function(){
    //generate token
    const resetToken = crypto.randomBytes(20).toString("hex");

    //hashing and adding resetpasswordtoken to userschema
    this.resetpasswordToken=crypto.createHash("sha256").update(resetToken).digest("hex");
    this.resetPasswordExpire =Date.now() + 15*60*1000; //milisecond
    return resetToken;
}
module.exports = mongoose.model("User",userSchema);