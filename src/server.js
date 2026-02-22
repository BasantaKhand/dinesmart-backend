const app = require('./app');
const connectDB = require('./config/db');
const config = require('./config/env');

// Connect to database
connectDB();

const PORT = config.port;

const server = app.listen(PORT, () => {
    console.log(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    // Close server & exit process
    server.close(() => process.exit(1));
});
