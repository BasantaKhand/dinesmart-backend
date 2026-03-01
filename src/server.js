const app = require('./app');
const connectDB = require('./infrastructure/db/connection');
const config = require('./config/env');
const http = require('http');
const { Server } = require('socket.io');

// Connect to database
connectDB();

const PORT = config.port;

// Create HTTP server
const server = http.createServer(app);

// Set up Socket.io
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
    },
});

// Store io instance in app for access in controllers
app.set('io', io);

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('🔗 Client connected:', socket.id);

    // Handle user role-based room joining
    socket.on('join_notifications', (data) => {
        // Support both string (role only) and object (role + restaurantId)
        const userRole = typeof data === 'string' ? data : data?.role;
        const restaurantId = typeof data === 'object' ? data?.restaurantId : null;
        
        const validRoles = ['SUPERADMIN', 'RESTAURANT_ADMIN', 'ADMIN', 'MANAGER', 'WAITER', 'CASHIER', 'KITCHEN'];
        
        if (userRole && validRoles.includes(userRole)) {
            // Join role-based room
            const roleRoom = `${userRole}_notifications`;
            socket.join(roleRoom);
            console.log(`✅ ${userRole} joined role room "${roleRoom}":`, socket.id);
            
            // Join restaurant-specific room if restaurantId provided
            if (restaurantId) {
                const restaurantRoom = `restaurant_${restaurantId}`;
                socket.join(restaurantRoom);
                
                // Also join role-specific restaurant room
                const roleRestaurantRoom = `restaurant_${restaurantId}_${userRole}`;
                socket.join(roleRestaurantRoom);
                
                console.log(`✅ ${userRole} joined restaurant rooms:`, restaurantRoom, roleRestaurantRoom);
            }
            
            const roomSockets = io.sockets.adapter.rooms.get(roleRoom);
            const socketCount = roomSockets ? roomSockets.size : 0;
            console.log(`📊 Total ${userRole} clients in room:`, socketCount);
        } else {
            console.log('❌ Attempted to join with invalid role:', userRole);
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('❌ Client disconnected:', socket.id);
    });

    socket.on('error', (error) => {
        console.error('🔴 Socket error:', error);
    });
});

server.listen(PORT, () => {
    console.log(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    // Close server & exit process
    server.close(() => process.exit(1));
});
