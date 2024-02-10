class ApiFeatures{
    constructor(query,queryStr){
        this.query=query;
        this.queryStr=queryStr;
    }
    search(){
        const keyword = this.queryStr.keyword?{
            name:{
                $regex:this.queryStr.keyword,
                $options:"i"
            },
        }
        :
        {}
        console.log( keyword)
         
       
        this.query=this.query.find({...keyword})
        return this;
    }
    filter(){
        const querycopy = {...this.queryStr}
        //remove some field for category
        console.log(querycopy)
        const removefields=['keyword','page','limit']
        removefields.forEach((key)=>{
            delete querycopy[key]
            
        })
        console.log(querycopy)
        //price and rating
        let queryStr = JSON.stringify(querycopy)//convert the object into stringfy
        queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g,(key)=>`$${key}`)
        console.log(queryStr) //string
       
        this.query = this.query.find(JSON.parse(queryStr));
            
        return this;

    }
    pagination(resultpage){
        const currentpage = Number(this.queryStr.page)||1;
        const skip = resultpage *(currentpage-1);
        this.query = this.query.limit(resultpage).skip(skip);
        return this;
    }
}
module.exports=ApiFeatures