const Product = require("./ProductModels")
const updateStock=async(id,quantity)=>{
      const product = await Product.findById(id);
      product.Stock -=quantity
      await product.save({validateBeforeSave:false})
}
module.exports=updateStock