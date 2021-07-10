const express = require('express')
const WebSocket = require('ws')
const { interval } = require('rxjs')
const { Subject } = require('rxjs')
const { nanoid } = require('nanoid')

const authenticate = (request, next) => {
  const user = request.url.replace('/', '')
  console.log('authenticate ' + user)
  if(!user) return next('nope')
  next(null, {
    user: user,
    connection_id: nanoid()
  })
}

const app = express()

const wsSubjects = {}

app.use(express.json())

const wss = new WebSocket.Server({ noServer: true })
wss.on('connection', (ws, request, user) => {

  if(!wsSubjects[user.user]) wsSubjects[user.user] = new Subject()

  const keepalive = interval(1000 * 30).subscribe(() => { // 30 seconds
    if (ws.connected === false){
      console.log(`${(new Date).toISOString()} disconnecting ${user.user} connection ${user.connection_id} with ${subject.observers.length} observers`)
      ws.terminate()
      return
    }
    ws.connected = false
    console.log(`${(new Date).toISOString()} sending ping for ${user.user} connection ${user.connection_id} with ${subject.observers.length} observers`)
    ws.ping(() => {})
  })

  const subject = wsSubjects[user.user]

  const subscription = subject.subscribe(data => {
    // message received from subject subscription, if it's from another connection send it
    const stuff = {
      data: data,
      user: user
    }
    if(user.connection_id == data.sender.connection_id) return

    console.log(`${(new Date).toISOString()} sending data`, stuff)
    ws.send(JSON.stringify(stuff))
  })

  console.log(`${(new Date).toISOString()} received connection for ${user.user} connection ${user.connection_id} with ${subject.observers.length} observers`)

  ws.on('message', msg => {
    let message = {}
    try {
      message = JSON.parse(msg)
    }catch (e) {
      console.log('error parsing message')
      return
    }
    //message received by client send to subject
    console.log(`${(new Date).toISOString()} received message for ${user.user} connection ${user.connection_id} with ${subject.observers.length} observers`)
    subject.next({
      sender: user,
      data: message
    })
  })

  ws.on('pong', () => {
    console.log(`${(new Date).toISOString()} received pong for ${user.user} connection ${user.connection_id} with ${subject.observers.length} observers`)
    ws.connected = true
  })

  ws.on('close', () => {
    subscription.unsubscribe()
    keepalive.unsubscribe()
    console.log(`${(new Date).toISOString()} disconnected ${user.user} connection ${user.connection_id} with ${subject.observers.length} observers remaining`)
  })
})


// this sends a ping to all clients at the same time
// interval(1000 * 30).subscribe(_ => { // 30 seconds
//   wss.clients.forEach(ws => {
//     if (ws.connected === false){
//       console.log('disconnecting')
//       //ws.subscription.unsubscribe()
//       ws.terminate()
//       return
//     }
//     ws.connected = false
//     ws.ping(_ => {})
//   })
// })

// interval(1000).subscribe(_ => {
//   console.log(wss.clients.size)
// })

// interval(1000).subscribe(n => {
//   wss.clients.forEach((client) => {
//     console
//     //console.log(Object.keys(client))
//     //if (client !== ws && client.readyState === WebSocket.OPEN){
//     if (client.readyState === WebSocket.OPEN){
//       console.log('sending data')
//       client.send(JSON.stringify('hi there ' + n))
//     }
//   })
// })

const server = app.listen(3000)
server.on('upgrade', (request, socket, head) => {
  authenticate(request, (err, user) => {
    if (err || !user) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
      return
    }

    wss.handleUpgrade(request, socket, head, ws => {
      wss.emit('connection', ws, request, user)
    })
  })
})
