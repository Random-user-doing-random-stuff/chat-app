const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Message = require('../models/Message');

// Route to get all chat rooms
router.get('/', async (req, res) => {
    try {
        const chats = await Chat.find();
        res.render('chatList', { chats });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Route to create a new chat room
router.post('/create', async (req, res) => {
    const { name } = req.body;
    try {
        let chat = await Chat.findOne({ name });
        if (chat) {
            return res.status(400).send('Chat room already exists');
        }
        chat = new Chat({ name });
        await chat.save();
        res.redirect('/chat');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Route to enter a specific chat room
router.get('/:chatId', async (req, res) => {
    const { chatId } = req.params;
    try {
        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).send('Chat room not found');
        }

        const messages = await Message.find({ chatId }).sort({ createdAt: 1 });
        res.render('chatRoom', { chat, messages });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = (io) => router;
