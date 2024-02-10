const nodeMailer = require("nodemailer")
const sendEmail  = async(options)=>{
    const transporter = nodeMailer.createTransport({
        service:"gmail",
        auth:{
            user:"dcengi123@gmail.com",
            pass:"myjxbrjlcyljddao"
        }

    })
    const mailOptions={
        from:"dcengi123@gmail.com",
        to:options.email,
        subject:options.subject,
        text:options.message,
    }
    await transporter.sendMail(mailOptions)

}
module.exports=sendEmail;