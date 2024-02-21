const mongoose = require("mongoose");
const validator = require("validator")
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv")
const crypto=require("crypto")
dotenv.config({path:"./config/config.env"})
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please Enter Your Name"],
        maxLength: [30, "Name cannot exceed 30 characters"],
        minLength: [4, "Name should have more than 4 characters"],
      },
      email: {
        type: String,
        required: [true, "Please Enter Your Email"],
        unique: true,
        validate: [validator.isEmail, "Please Enter a valid Email"],
      },
      password: {
        type: String,
        required: [true, "Please Enter Your Password"],
        minLength: [8, "Password should be greater than 8 characters"],
        select: false,
      },
      avatar: {
        public_id: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
      },
      role: {
        type: String,
        default: "user",
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    
      resetPasswordToken: String,
      resetPasswordExpire: Date,


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