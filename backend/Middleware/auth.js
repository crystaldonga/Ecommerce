const jsonwebtoken = require("jsonwebtoken")
const User = require("../Models/usermodels")
const cookieParser = require("cookie-parser")
const catchAsyncError = require("../Middleware/catchAsyncError")
const auth =catchAsyncError( async(req,res,next)=>{
    const token = req.cookies;
    console.log(token);
    if(!token.jwt){
        return next(res.status(401).send("Please Login to acess this resource"))
    }
    const verifyUser = jsonwebtoken.verify(token.jwt,"bcesudghwuetq27swsbxcjhh7ewdqwudnwkuyyd")
    console.log(verifyUser)

    const user =await User.findById({_id:verifyUser.id})
    console.log(user)
    req.token=token.jwt,
    req.user=user
    console.log(req.user.role);
    next()
})

const authorization = catchAsyncError(async(req,res,next)=>{
   let roles="admin";
   if(!roles.includes(req.user.role)){
    console.log(roles)
    console.log(req.user.role)
    return next(res.status(403).send(`Role : ${req.user.role} is not allowed to acess this resource`));
   }
   next();
})


   
module.exports={auth,authorization};