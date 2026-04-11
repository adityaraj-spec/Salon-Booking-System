import fs from 'fs';
const asyncHandler = (requestHandler) => {
    return (req, res, next) =>{
        Promise.resolve(requestHandler(req, res, next))
        .catch((err) => {
            fs.appendFileSync('error.log', new Date().toISOString() + ': ' + (err.stack || err.message) + '\n');
            next(err)
        })
    }
}


export {asyncHandler}