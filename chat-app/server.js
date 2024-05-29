const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

// Configuración del servidor
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware para servir archivos estáticos
app.use(express.static('public'));

// Lista de usuarios conectados y grupos
let users = {};
let groups = {};

io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado');

    socket.on('newUser', (username) => {
        socket.username = username;
        users[username] = socket.id;
        io.emit('updateUserList', Object.keys(users));
        io.emit('updateGroupList', groups);
    });

    socket.on('disconnect', () => {
        console.log('Cliente desconectado');
        delete users[socket.username];
        io.emit('updateUserList', Object.keys(users));
        io.emit('updateGroupList', groups);
    });

    socket.on('createGroup', (groupName) => {
        if (!groups[groupName]) {
            groups[groupName] = { members: [socket.username] };
            socket.join(groupName);
            io.to(socket.id).emit('groupCreated', groupName);
            io.emit('updateGroupList', groups);
        } else {
            io.to(socket.id).emit('error', 'El grupo ya existe.');
        }
    });

    socket.on('joinGroup', (groupName) => {
        if (groups[groupName]) {
            if (!groups[groupName].members.includes(socket.username)) {
                groups[groupName].members.push(socket.username);
            }
            socket.join(groupName);
            io.to(socket.id).emit('groupJoined', groupName);
            io.to(groupName).emit('groupMessage', { user: 'system', message: `${socket.username} se ha unido al grupo.` });
            io.emit('updateGroupList', groups);
        } else {
            io.to(socket.id).emit('error', 'El grupo no existe.');
        }
    });

    socket.on('groupMessage', ({ groupName, message }) => {
        if (groups[groupName] && groups[groupName].members.includes(socket.username)) {
            io.to(groupName).emit('groupMessage', { user: socket.username, message });
        } else {
            io.to(socket.id).emit('error', 'No eres miembro de este grupo.');
        }
    });
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
