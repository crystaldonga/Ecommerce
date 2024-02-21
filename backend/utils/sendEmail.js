const nodeMailer = require("nodemailer")
const dotenv = require("dotenv")
dotenv.config({path:"./config/config.env"})
const sendEmail  = async(options)=>{
    const transporter = nodeMailer.createTransport({
        service:"gmail",
        auth:{
            user:process.env.ADMIN_EMAIL,
            pass:process.env.ADMIN_EMAIL_PASSWORD
        }

    })
    const mailOptions={
        from:process.env.ADMIN_EMAIL,
        to:options.email,
        subject:options.subject,
        text:options.message,
    }
    await transporter.sendMail(mailOptions)

}
module.exports=sendEmail;