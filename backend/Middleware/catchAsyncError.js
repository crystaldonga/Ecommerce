module.exports =(theFunc)=>(req,res,next)=>{
Promise.resolve(theFunc(req,res,next)).catch(next);
}
// const error = (req,res,next)=>{
//     Promise.resolve(error(req,res,next)).catch(next)
// }
// module.exports=error