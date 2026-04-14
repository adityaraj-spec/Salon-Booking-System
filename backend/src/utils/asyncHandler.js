const asyncHandler = (requestHandler) => {
    return (req, res, next) =>{
        Promise.resolve(requestHandler(req, res, next))
        .catch((err) => {
            console.error("AsyncHandler Error Captured:", err.stack || err.message);
            next(err)
        })
    }
}


export {asyncHandler}