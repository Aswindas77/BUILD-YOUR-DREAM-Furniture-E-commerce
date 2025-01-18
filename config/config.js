const  { v4: uuidv4 } =require('uuid');

const sessionSecret=uuidv4();

const passwordToken = uuidv4();

module.exports ={sessionSecret,passwordToken }