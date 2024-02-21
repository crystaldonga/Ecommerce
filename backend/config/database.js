const mongoose = require("mongoose");
const dotenv = require("dotenv")
dotenv.config({path:"./config/config.env"})
const database=(()=>{
    mongoose.connect(process.env.DB_URL).then(()=>{
        console.log("connecting...")
    })
})
module.exports=database;
