const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const MongoStore = require('connect-mongo');
const { Server } = require('socket.io');
const http = require('http');
const sharedSession = require('express-socket.io-session');
const User = require('./models/User');
const Message = require('./models/Message');
const Chat = require('./models/Chat');

const dotenv = require('dotenv');
dotenv.config({ path: './config/config.env' });
console.log(process.env['session_key'])

// Import Passport Config
require('./config/passport')(passport);

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.set('view engine', 'ejs');
app.use(express.static('public'));

// Session middleware
const sessionMiddleware = session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ 
        mongoUrl: 'mongodb://localhost/chat-app',
        ttl: 14 * 24 * 60 * 60 // Session expiry (optional, here it's 14 days)
    }),
    cookie: {
        maxAge: 14 * 24 * 60 * 60 * 1000 // Cookie expiry (14 days)
    }
});

app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static('public'));

// MongoDB connection
mongoose.connect('mongodb://localhost/chat-app', { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log(err));

// Share session between Express and Socket.IO
io.use(sharedSession(sessionMiddleware, {
    autoSave: true
}));

// Routes
app.use('/', require('./routes/index')(passport));
app.use('/chat', require('./routes/chat')(io)); // Chat routes

// Socket.IO connection
io.on('connection', (socket) => {
    const userId = socket.handshake.session.passport?.user;

    if (userId) {
        User.findById(userId).then(user => {
            if (user) {
                console.log(`${user.username} connected`);

                // Join specific chat room
                socket.on('joinRoom', ({ chatId }) => {
                    socket.join(chatId);
                    console.log(`${user.username} joined room: ${chatId}`);

                    // Listen for chatMessage event
                    socket.on('chatMessage', async (data) => {
                        const { message } = data;

                        // Save the message to the database
                        const newMessage = new Message({
                            chatId: chatId,
                            username: user.username,
                            message: message
                        });

                        await newMessage.save();

                        // Broadcast the message to the chat room
                        io.to(chatId).emit('chatMessage', { username: user.username, message: message });
                    });
                });

                socket.on('disconnect', () => {
                    console.log(`${user.username} disconnected`);
                });
            }
        });
    } else {
        console.log('A guest connected');
        socket.on('disconnect', () => {
            console.log('A guest disconnected');
        });
    }
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on http://127.0.0.1:${PORT}`));
