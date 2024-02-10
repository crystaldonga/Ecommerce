const express = require("express");
const app= express();
const connectdatabase = require("./config/database")
const dotenv = require("dotenv")
const Product = require("./Models/ProductModels")
const updateStock=require("./Models/updateStock")
const catchAsyncError = require("./Middleware/catchAsyncError")
const ApiFeatures=require("./utils/apifeatures")
const User = require('./Models/usermodels')
const Order =require("./Models/orderModel")
dotenv.config({path:"./config/config.env"})
const cookieParser = require("cookie-parser")
const {auth,authorization }= require("./Middleware/auth")
const sendEmail = require("./utils/sendEmail")
const crypto = require("crypto")


app.use(cookieParser())
connectdatabase()
app.use(express.json())
//uncaught error
process.on("uncaughtException",(e)=>{
    console.log(`Error : ${e.message}`);
    console.log(`uncaught error`);
})
//create the product--admin
app.post("/admin/product/new",auth,authorization,catchAsyncError(async(req,res,next)=>{
   //req.body.user =req.user._id 
    const product = await Product.create(req.body);
    res.status(201).send(product)
}))
//get all product
app.get("/product",auth,catchAsyncError(async(req,res)=>{
  const resultpage=5;
 // const productcount = await Product.countDocument()
  const apifeatures = new ApiFeatures( Product.find(),req.query).search().filter().pagination(resultpage);
  const products=await apifeatures.query;
  res.status(200).json({
    sucess:true,
    products,
   // productcount
});
}))

//update the product --admin
app.put("/admin/product/:id",auth,authorization,catchAsyncError(async(req,res,next)=>{
    let product =  await Product.findById(req.params.id);
    if(!product){
        return res.status(500).send("Product not found")
    }
    product = await Product.findByIdAndUpdate(req.params.id , req.body,{
        new:true
    })
    res.status(200).send(product)
}))
//delet product
app.delete("/admin/product/:id",auth,authorization,catchAsyncError(async(req,res)=>{
    let product = await Product.findById(req.params.id);
    if(!product){
        return res.status(500).send("Product not found")
    }
  product=  await Product.findByIdAndDelete(req.params.id);
    res.status(200).send("Deleted sucessfully")
}))

const server=app.listen(process.env.PORT,(()=>{
    console.log("listing....")
}))
//console.log(youtube)
//authentication
app.post("/register",catchAsyncError(async(req,res,next)=>{
    const {name,email,password} = req.body;
    const user = await User.create({
        name,email,password,
        avatar:{
            public_id:"this is a sample id",
            url:"profilepicurl"
        }
    });
    
    //token creation
    const token  = user.getJWTToken();
    res.status(201).json({
        sucess:true,
        token
    })
}))

app.post("/login",catchAsyncError(async(req,res,next)=>{
     const {email,password} = req.body;
     if(!email || !password){
        res.status(400).send("Please Enter a Email & Password")
     }
     const user  =await User.findOne({email}).select("+password")
     console.log(user)
     if(!user){
     res.status(401).send("Invalid Email or Password")
     }
     console.log(user)
     const isPassword = await user.comparePassword(password);
     console.log(isPassword)
     if(!isPassword){
        res.status(401).send("Invalid Email or Password")
     }
    const token  = user.getJWTToken();
    res.status(201).cookie("jwt",token,{
        expires:new Date(Date.now()+1000000000000),
        //secure:true
      }).json({
        sucess:true,
        user,
        token
      });


}))
app.get("/logout",catchAsyncError(async(req,res,next)=>{
    res.cookie("jwt",null,{
        expires:new Date(Date.now()),
        httpOnly:true
    })
    res.status(200).json({
        sucess:true,
        message:"Logged Out"
    })
}))
//forget password
app.post("/password/forgot",catchAsyncError(async(req,res,next)=>{
    const user =await User.findOne({email:req.body.email});
    if(!user){
        return(next(res.status(404).send("User not found")))
    }
    //get password token
    const resetToken = user.getResetPassword();
    await user.save({validateBeforeSave:false})

    const resetPasswordUrl = `${req.protocol}://${req.get("host")}/password/reset/${resetToken}`
    const message = `Your password reset token is :- \n\n ${resetPasswordUrl} \n\nIf you have not requested this email then, please ignore it`;
    try{
      await sendEmail({
      email:user.email,
      subject:`Ecommerce Password Recovery`,
      message:message
      })
      res.status(200).json({
        sucess:true,
        message:`Email sent to ${user.email} sucessfully`
      })
    }catch(e){
        user.resetpasswordToken=undefined;
        user.resetPasswordExpire=undefined;

        await user.save({validateBeforeSave:false})
        return(next(res.status(500).send(e.message)))
    }
}))
//reset password
app.put("/password/reset/:token",catchAsyncError(async(req,res,next)=>{
    //create hash token
     
    const resetpasswordToken = crypto.createHash("sha256").update(req.params.token).digest("hex");
    console.log(resetpasswordToken)
    const user = await User.findOne({
        resetpasswordToken,
        resetPasswordExpire:{$gt:Date.now()} ,
    })
    
    if(!user){
        return (next(res.status(404).send("Reset Password Token is invalid or has been expired")));
    }
    if(req.body.password!=req.body.confirmPassword){
        return(next(res.status(400).send("Passwords do not match")))
    }

    user.password =req.body.password;
    user.resetpasswordToken=undefined;
    user.resetPasswordExpire=undefined;
    await user.save();
    res.status(200).json({
        user
    })


}))
app.get("/me",auth,catchAsyncError(async(req,res,next)=>{
           const user = await User.findById(req.user._id);
           res.status(200).json({
            user
           })
}))
//update profile password
app.put("/password/update",auth,catchAsyncError(async(req,res,next)=>{
           const user = await User.findById(req.user._id).select("+password")
           const isPasswordMatched = await user.comparePassword(req.body.oldPassword);
           if(!isPasswordMatched){
            return(next(res.status(400).send("old password in incorrect")))
           }
           if(req.body.newPassword!=req.body.confirmPassword){
            return(next(res.status(400).send("Password does not match")))
           }
           user.password = req.body.newPassword;
           await user.save();
           res.status(200).json({
            user,
            
           })

}))
app.put("/me/update",auth,catchAsyncError(async(req,res,next)=>{
    const newUserDate = {
    name:req.body.name,
    email:req.body.email

    };
    const user =await User.findByIdAndUpdate(req.user._id,newUserDate,{
        new:true
    });
    res.status(200).json({
        sucess:true
    })
}))
//get all users (admin)
app.get("/admin/users",auth,authorization,catchAsyncError(async(req,res,next)=>{
 const users = await User.find();
 res.status(200).json({
    sucess:true,
    users
 })
}))
//get single user(admin)
app.get("/admin/user/:id",auth,authorization,catchAsyncError(async(req,res,next)=>{
    const user= await User.findById(req.params.id);
    if(!user){
        return(next(res.status(400).send(`user does not exits with id : ${req.params.id}`)))
    }
    res.status(200).json({
       sucess:true,
       user
    })
   }))
   //update users role (admin)
   app.put("/admin/user/:id",auth,authorization,catchAsyncError(async(req,res,next)=>{
    const newUserDate = {
        // name:req.body.name,
        // email:req.body.email,
        role:req.body.role
    
        };
        const user =await User.findByIdAndUpdate(req.params.id,newUserDate,{
            new:true
        });
        await user.save()
        res.status(200).json({
            sucess:true
        })
   }))
   //delet user (admin)
   app.delete("/admin/user/:id",auth,authorization,catchAsyncError(async(req,res,next)=>{
    const user =await User.findById(req.params.id)
    if(!user){
        retur(next(res.status(400).send("user is not exits")))
    }
   // await user.remove();
  await User.deleteOne({ _id: user._id })
    res.status(200).json({
        sucess:true
    })
   }))
    //review and update productmodels.js
    app.put("/review",auth,catchAsyncError(async(req,res,next)=>{
        const{rating,comment,productId} = req.body
        const review={
            user:req.user._id,
            name:req.user.name,
            rating:Number(rating),
            comment,
        };
        console.log(review)
        const product = await Product.findById(req.body.productId)
        console.log(product)
        let isReviews = product.reviews.find((rev)=>{
            rev.user.toString()===req.user._id.toString()
        });
        if (isReviews) {
            product.reviews.forEach((rev)=>{
                if( rev.user.toString()===req.user._id.toString())
                    rev.rating=rating,
                    rev.comment=comment
                
            });
        } else {
            product.reviews.push(review);
            product.numOfReviews=product.reviews.length
        }
        let avg=0;
        product.ratings = product.reviews.forEach((rev)=>{
            avg+=rev.rating
        })
        product.ratings=avg/product.reviews.length

        await product.save({validateBeforeSave:false})
        res.status(200).json({
            sucess:true
        })

    }))
    //get all review of a product
    app.get("/reviews",auth,catchAsyncError(async(req,res,next)=>{
        const product = await Product.findById(req.query.productId);
        console.log(product)
        if(!product){
            return(next(res.status(404).send("Product not found")))
        }
        res.status(200).json({
            sucess:true,
            reviews:product.reviews
        })
    }))
    //delet reviews
    app.delete("/reviews",auth,catchAsyncError(async(req,res,next)=>{
        const product = await Product.findById(req.query.productId)
        console.log(product)
        if(!product){
            return(next(res.status(404).send("Product not found")))
        }
        const reviews = product.reviews.filter((rev)=>{
            rev._id.toString()!==req.query.id.toString()
        })
        console.log(reviews)
        let avg=0;
          reviews.forEach((rev)=>{
            avg+=rev.rating
        })
        console.log(reviews)
        
   const  ratings=avg/reviews.length
       const numOfReviews=reviews.length;
       await Product.findByIdAndUpdate(req.query.productId,{
        reviews,
        ratings,
        numOfReviews,
       }
       ,{
        new:true,
        useFindANdModift:false
    })

       res.status(200).json({
        sucess:true
       })


    }))
    //           -------------Order Section ----------------------
app.post("/order/new",auth,catchAsyncError(async(req,res,next)=>{
    
    const order =await Order.create({
        shippingInfo:req.body.shippingInfo,
        orderItem:req.body.orderItem,
        paymentInfo:req.body.paymentInfo,
        itemsPrice:req.body.itemsPrice,
        taxPrice:req.body.taxPrice,
        shippingPrice:req.body.shippingPrice,
        totalPrice:req.body.totalPrice,
        paidAt:Date.now(),
        user:req.user._id,

    })
    res.status(200).json({
        sucess:true,
        order
    })
}))
    //get single user ----admin
    app.get("/orders/:id",auth,authorization,catchAsyncError(async(req,res,next)=>{
           const order =await Order.findById(req.params.id).populate("user","name email");
           if(!order){
            return(next(res.status(400).send("Oeder not found with this Id")))
           }
           res.status(200).json({
            sucess:true,
            order
           })
    }))
    //get logged in user  my order --user
    app.get("/orders/me",auth,catchAsyncError(async(req,res,next)=>{
      const order = await Order.find({user:req.user._id});
      console.log(order)
      if(!order){
        return(next(res.status(400).send("Oeder not found with this Id")))
       }
       res.status(200).json({
        sucess:true,
        order
       })

    }))
    //get all oders --admin
    app.get("/admin/orders",auth,authorization,catchAsyncError(async(req,res,next)=>{
        const order = await Order.find();
      console.log(order)
      if(!order){
        return(next(res.status(400).send("Order not found with this Id")))
       }
       let totalamount = 0;
       order.forEach((val)=>{
        totalamount+=val.paymentInfo.totalPrice
       })
       res.status(200).json({
        sucess:true,
        totalamount,
        order
       })
    }))
    //update order status -------admin
    app.put("/admin/order/:id",auth,authorization,catchAsyncError(async(req,res,next)=>{
        const order = await Order.findById(req.params.id);
        console.log(order)
        if(!order){
            return(next(res.status(400).send("Order not found with this Id")))
           }
        if(order.paymentInfo.orderStatus==="Deliverd"){
            return(next("You have alredy deliverd this order"))
        }
        order.orderItem.forEach(async(o)=>{
            await updateStock(o.product,o.quantity);
        })
        order.paymentInfo.orderStatus = req.body.status;
        if(req.body.status=="Deliverd"){
            order.deliveredAt=Date.now()
        }
        await order.save({validateBeforeSave:false})
        res.status(200).json({
            sucess:true,
        })
        //delete order -------admin

        app.delete("/admin/order/:id",auth,authorization,catchAsyncError(async(req,res,next)=>{
            const order = await Order.find(req.params.id);
            if(!order){
                return(next(res.status(400).send("Order not found with this Id")))
               }
            await order.remove()
            res.status(200).json({
                sucess:true,

            })
        }))
        


    }))


    


//unhandle promise rejection
process.on("unhandledRejection",(e)=>{
    console.log(`Error : ${e.message}`);
    console.log("shutting down the server due to unhandled Promise Rejection");

    server.close(()=>{
        process.exit(1)
    });

})
module.exports =app;