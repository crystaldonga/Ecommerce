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
const cloudinary = require("cloudinary")
const bodyParser = require("body-parser")
const fileUpload = require("express-fileupload")
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.use(cookieParser())
connectdatabase()
app.use(bodyParser.urlencoded({extended:true}))
app.use(fileUpload())
cloudinary.config({
    cloud_name:process.env.CLOUDINARY_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
    // cloud_name:"dxxk4yqg6",
    // api_key:"736744516528549",
    // api_secret:"o7PJZSBoFqntSd9LTFYcZ04eolA"


})
//console.log(cloud_name)

app.use(express.json())
//uncaught error
process.on("uncaughtException",(e)=>{
    console.log(`Error : ${e.message}`);
    console.log(`uncaught error`);
})

//create the product--admin
app.post("/admin/product/new",auth,authorization,catchAsyncError(async(req,res,next)=>{
   let images=[];
   if(typeof req.body.images==="string"){
    images.push(req.body.images);
   }else{
    images =req.body.images;
   }
   const imagesLink=[];
   let result;
   for(let i=0;i<images.length;i++){
   result = await cloudinary.v2.uploader.upload(images[i],{
    folder:"products",
  })
   }
   imagesLink.push({
    public_id:result.public_id,
    url:result.secure_url
   })
    //req.body.user =req.user._id 
    req.body.images=imagesLink
    const product = await Product.create(req.body);
    res.status(201).json({
        success:true,
        product
    })
}))

//update product admin
app.put("/admin/product/:id",auth,authorization,catchAsyncError(async(req,res,next)=>{
    let product =  await Product.findById(req.params.id);
    console.log(product);
    if(!product){
        return res.status(500).json({message:"Product not found"})
    }
    let images=[];
    if(typeof req.body.images==="string"){
        images.push(req.body.images)
    }else{
        images=req.body.images
    }

    if(images!==undefined){
        //deleted the image 
        for(let i=0;i<product.images.length;i++){
            await cloudinary.v2.uploader.destroy(product.images[i].public_id)
        }
        let imagesLink=[];
        for(let i=0;i<images.length;i++){
            let result = await cloudinary.v2.uploader.upload(images[i],{
                folder:"products"
            })

            imagesLink.push({
                public_id:result.public_id,
                url:result.secure_url
            })
        }
        req.body.images=imagesLink

    }
    
    console.log(req.body)
    product = await Product.findByIdAndUpdate(req.params.id , req.body,{
        new:true
    })
    res.status(200).json({
        success:true,
        product
    })
}))
//get all product
app.get("/products",catchAsyncError(async(req,res)=>{
  const resultPerPage=5;
  const productsCount = await Product.countDocuments()
  let apifeatures = new ApiFeatures( Product.find(),req.query)
  .search()
  .filter()
  let products = await apifeatures.query;
  //let filteredProductsCount = products.length;
  //apifeatures.pagination(resultPerPage)
   //products=await apifeatures.query;
  res.status(200).json({
    sucess:true,
    products,
    resultPerPage,
    productsCount,
   // filteredProductsCount

});
}))

 
app.get("/admin/products",auth,authorization,catchAsyncError(async(req,res,next)=>{
    const products = await Product.find();
    res.status(200).json({
        sucess:true,
        products
    })
}))
//get product details
app.get("/product/:id",auth,catchAsyncError(async(req,res,next)=>{
    
    console.log(req.params.id);
    console.log("react");
    const product = await Product.findById(req.params.id);
    console.log(product)
    if(!product){
        return(next(res.status(404).send("Product not found")))
    }
    res.status(200).json({
        sucess:true,
        product
    })
}))

//update the product --admin

//delet product
app.delete("/admin/product/:id",auth,authorization,catchAsyncError(async(req,res)=>{
    let product = await Product.findById(req.params.id);
    if(!product){
        return res.status(500).send("Product not found")
    }
  for(let i=0;i<product.images.length;i++){
    await cloudinary.v2.uploader.destroy(product.images[i].public_id);

  }

   await Product.findByIdAndDelete(req.params.id);
 // await product.remove()
    res.status(200).json({
        success:true,
        message:"product delete sucessfully "
    })
}))

const server=app.listen(process.env.PORT,(()=>{
    console.log("listing....")
}))
//console.log(youtube)
//authentication
app.post("/register",catchAsyncError(async(req,res,next)=>{
   // console.log("hy")
    //console.log(process.env.CLOUDINARY_NAME)
    //console.log(req.body.avatar)
    //console.log(req.body)
    let myCloud;
    try{
     myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, {
        folder: "avatars",
        width: 150,
        crop: "scale",
      });
    }catch(e){
      console.log(e)
    }
      console.log(JSON.stringify(myCloud))
    const {name,email,password} = req.body;
    const user = await User.create({
        name,email,password,
        avatar:{
            public_id:myCloud.public_id,
            url:myCloud.secure_url
            // public_id:"sample",
            // url:"_url"
        }
    });
    
   // token creation
   const token  = user.getJWTToken();
   res.status(201).cookie("jwt",token,{
    expires:new Date(Date.now()+9000000000000),
    //secure:true
  }).json({
    sucess:true,
    user,
    token
  });
}))

app.post("/login",catchAsyncError(async(req,res,next)=>{
     const {email,password} = req.body;
     console.log("sucessfully")
     if(!email || !password){
        res.status(400).send("Please Enter a Email & Password")
     }
     const user  =await User.findOne({email}).select("+password")
     console.log(user)
     if(!user){
     res.status(401).send("Invalid Email or Password")
     }
     console.log("good")
     console.log(user)
     const isPassword = await user.comparePassword(password);
     console.log(isPassword)
     if(!isPassword){
        res.status(401).send("Invalid Email or Password")
     }
    const token  = user.getJWTToken();
    console.log(token)
    res.status(201).cookie("jwt",token,{
        expires:new Date(Date.now()+9000000000000),
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

   // const resetPasswordUrl = `${req.protocol}://${req.get("host")}/password/reset/${resetToken}`
    const resetPasswordUrl = `${process.env.FORNTEND_URL}/password/reset/${resetToken}`
    const message = `Your password reset token is temp:- \n\n ${resetPasswordUrl} \n\nIf you have not requested this email then, please ignore it`;
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
        sucess:true,
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
            sucess:true,
            user,
            
           })

}))
//update user profile and use cloudinary
app.put("/me/update",auth,catchAsyncError(async(req,res,next)=>{
    console.log("hy")
    const newUserDate = {
    name:req.body.name,
    email:req.body.email

    };
    try{
    if(req.body.avatar!==""){
         const user =await User.findById(req.user._id);
         const imageId = user.avatar.public_id;
         await cloudinary.v2.uploader.destroy(imageId);
         const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar,{
            folder:"avatars",
            width:150,
            crop:"scale"
         })
         console.log(myCloud)
         newUserDate.avatar={
            public_id:myCloud.public_id,
            url:myCloud.secure_url
         }


    }
}catch(e){
    console.log(e)
}
    const user =await User.findByIdAndUpdate(req.user._id,newUserDate,{
        new:true
    });
    //console.log(user)
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
            success:true
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
    const {
        shippingInfo,
        orderItems,
        paymentInfo,
        itemsPrice,
        taxPrice,
        shippingPrice,
        totalPrice,
      } = req.body;
      const order = await Order.create({
        shippingInfo,
        orderItems,
        paymentInfo,
        itemsPrice,
        taxPrice,
        shippingPrice,
        totalPrice,
        paidAt: Date.now(),
        user: req.user._id,
      });
    
      res.status(201).json({
        success: true,
        order,
      });
}))
 app.get("/orders/me",auth,catchAsyncError(async(req,res,next)=>{
        // console.log("gn")
         console.log(req.user)
         let order;
        try{
       order = await Order.find({user:req.user._id});
    
        }catch(e){
           console.log(e.getMessage())
        }
      if(!order){
        return(next(res.status(400).send("Order not found with this Id")))
       }
       res.status(200).json({
        sucess:true,
        order
       })

    }))
    //get single user ----admin
    app.get("/order/:id",auth,catchAsyncError(async(req,res,next)=>{
           const order =await Order.findById(req.params.id).populate("user","name email");
           console.log(order)
           if(!order){
            return(next(res.status(400).send("Oeder not found with this Id")))
           }
          // await order.save({validateBeforeSave:false})
           res.status(200).json({
            sucess:true,
            order
           })
    }))
    //get logged in user  my order --user
   
    //get all oders --admin
    app.get("/admin/orders",auth,authorization,catchAsyncError(async(req,res,next)=>{
        const orders = await Order.find();
     // console.log(orders)
      if(!orders){
        return(next(res.status(400).send("Order not found with this Id")))
       }
       let totalamount = 0;
       orders.forEach((val)=>{
        totalamount+=val.paymentInfo.totalPrice
       })
       res.status(200).json({
        sucess:true,
        totalamount,
        orders
       })
    }))
    //update order status -------admin
    app.put("/admin/order/:id",auth,authorization,catchAsyncError(async(req,res,next)=>{
        const order = await Order.findById(req.params.id);
      //  console.log(order)
        if(!order){
            return(next(res.status(400).send("Order not found with this Id")))
           }
        if(order.paymentInfo.orderStatus==="Deliverd"){
            return(next("You have alredy deliverd this order"))
        }
        order.orderItems.forEach(async(o)=>{
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
    }))
        //delete order -------admin

        app.delete("/admin/order/:id",auth,authorization,catchAsyncError(async(req,res,next)=>{
           console.log("gm");
           console.log(req.params.id);
            let order = await Order.findById(req.params.id);
         
           

            if(!order){
                return(next(res.status(400).send("Order not found with this Id")))
               }
               await Order.findByIdAndDelete(req.params.id);
           
            res.status(200).json({
                success:true,

            })
        }))
        


    
//make payment

    app.post("/payment/process",auth,catchAsyncError(async(req,res,next)=>{
       const myPayment = await stripe.paymentIntents.create({
        amount:req.body.amount,
        currency:"inr",
        metadata:{
            company:"Ecommerce"
        }
       })
       res.status(200).json({
        sucess:true,
        client_secret:myPayment.client_secret
       })
      // console.log(client_secret)
    }))

//send striper key frontend
app.get("/stripeapikey",auth,catchAsyncError(async(req,res,next)=>{
    res.status(200).json({
        stripeApiKey:process.env.STRIPE_API_KEY
    })
   // console.log(stripeApiKey)
}))

app.get("**",catchAsyncError(async(req,res,next)=>{
    res.send("good night")
}))
    


//unhandle promise rejection
process.on("unhandledRejection",(e)=>{
    console.log(`Error : ${e.message}`);
    console.log("shutting down the server due to unhandled Promise Rejection");

    server.close(()=>{
        process.exit(1)
    });

})
// app.listen(4000,()=>{
//     console.log("listing...")
// })
module.exports =app;