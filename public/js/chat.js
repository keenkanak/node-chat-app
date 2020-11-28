const socket = io()   //available due to the socket.io client side library

//DOM elements
const $sendButton = document.querySelector('#send')
const $inputField = document.querySelector('#inputMessage')
const $locationButton = document.querySelector('#location')
const $messages = document.querySelector('#messages')
const $sidebar = document.querySelector('#sidebar')

//Templates
const messageTemplate = document.querySelector('#message-template').innerHTML
const locationTemplate = document.querySelector('#location-template').innerHTML
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

//Query String on joining
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true })

//Autoscroll
const autoScroll = () => {
    //New Message Element
    const $newMessage = $messages.lastElementChild

    //Height Of The New Message
    const newMessageStyles = getComputedStyle($newMessage)
    const newMessageMargin = parseInt(newMessageStyles.marginBottom)
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin       //offset height doesn't include margins

    //Visible Height
    const visibleHeight = $messages.offsetHeight

    //Total Height of Messages Container
    const containerHeight = $messages.scrollHeight
    //How far has the client scrolled
    const scrollOffset = $messages.scrollTop + visibleHeight  //from the bottom

    if (containerHeight - newMessageHeight <= scrollOffset) {

        $messages.scrollTop = containerHeight
    }
}

//on listeners
socket.on('message', (message) => {       //receives event sent from the client and mustache renders messages on the UI
    console.log(message)
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('h:mm a') //using the moment library
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoScroll()
})
socket.on('locationMessage', (url) => {       //receives location sent from the client in the console
    console.log(url)
    const html = Mustache.render(locationTemplate, {
        username: url.username,
        location: url.url,
        createdAt: moment(url.createdAt).format('h:m a') //using the moment library
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoScroll()
})

socket.on('roomData', ({ room, users }) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    })
    $sidebar.innerHTML = html
})

//emit events
$sendButton.addEventListener('click', (e) => { //send message after clicking send button
    e.preventDefault()
    if ($inputField.value == '') {
        return
    }
    $sendButton.setAttribute('disabled', 'disabled')
    const message = $inputField.value
    socket.emit('sendMessage', message, (error) => {   //the error arg is an ack from the server
        $sendButton.removeAttribute('disabled')
        $inputField.value = ''
        $inputField.focus()
        // if (error) {
        //     return console.log(error)
        // }
        console.log('Delivered')
    })
    autoScroll()
})

$locationButton.addEventListener('click', (e) => {
    e.preventDefault()
    $locationButton.setAttribute('disabled', 'disabled')
    if (!navigator.geolocation) {
        console.log("Geolocation is not supported for this browser")
    }

    navigator.geolocation.getCurrentPosition((position) => {
        // console.log(position)
        const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        }
        const locationString = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
        socket.emit('sendLocation', location, locationString, (message) => {
            console.log(message)
            $locationButton.removeAttribute('disabled')  //re-enabling the button
        })
    })

})

socket.emit('join', { username, room }, (error) => {
    if (error) {
        alert(error)
        location.href = '/'
    }
})


