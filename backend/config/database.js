const mongoose = require("mongoose");
const database=(()=>{
    mongoose.connect(process.env.DB_URL).then(()=>{
        console.log("connecting...")
    })
})
module.exports=database;
