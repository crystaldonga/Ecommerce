const mongoose = require("mongoose");
const database=(()=>{
    mongoose.connect("mongodb://localhost:27017/Ecommerce").then(()=>{
        console.log("connecting...")
    })
})
module.exports=database;
