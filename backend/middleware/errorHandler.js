const AppError = require("../utils/appError");
// Any request that matched no route ends up here
const notFound = (req, res, next) => {
    next(new AppError("Route not found", 404));
};

const errorHandler = (err, req, res, next) => {
    if (err.name === "CastError" && err.kind === "ObjectId") {
        err = new AppError("Invalid id: " + err.value, 400);
    }
    if (err.isOperational) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
    }
    // A programmer error: log everything for us, tell the client nothing
    console.error(err);
    res.status(500).json({
        success: false,
        message: "Something went wrong",
    });
};

module.exports = { notFound, errorHandler };