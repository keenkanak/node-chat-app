const express = require('express')
const http = require('http')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocation } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)                 /*We require access to the raw http server
                                            (express creates it behing the scenes),
                                            therefore http module has been used.*/
const port = process.env.PORT || 3000

app.use(express.static('public'))

// let count = 0
// io.on('connection', (socket) => {
//     console.log("New websocket connection")
//     socket.emit('countUpdated', count)                 /*send an event to client*/
//     socket.on('increment', () => {
//         count++
//         socket.emit('countUpdated', count)
// //io emits to all clients
//         io.emit('countUpdated', count)
//     })
// })


io.on('connection', (socket) => {
    console.log("New websocket connection")

    socket.on('join', ({ username, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, username, room })
        if (error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage(`Welcome ${user.username}`))
        socket.broadcast.to(room).emit('message', generateMessage('Admin', `${user.username} has joined`))  //send message to everyone except the connected client
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        callback()
    })

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)
        const filter = new Filter()
        if (filter.isProfane(message)) {
            io.to(user.room).emit('message', generateMessage('Admin', `***PROFANITY*** by ${user.username}`))
            return callback()
        }
        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })

    socket.on('sendLocation', (location, locationString, callback) => {
        // console.log(location)
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocation(user.username, locationString))
        callback('Location sent')            //Behaves like socket.emit()
    })


    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left`))                 //Run code when a client disconnects
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})

server.listen(port, () => {
    console.log(`Server running on port ${3000}`)
})

