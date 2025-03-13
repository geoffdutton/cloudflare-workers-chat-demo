import './styles.css'

let currentWebSocket: WebSocket | null = null

let nameForm: HTMLFormElement | null = document.querySelector('#name-form')
let nameInput: HTMLInputElement | null = document.querySelector('#name-input')
let roomForm: HTMLFormElement | null = document.querySelector('#room-form')
let roomNameInput: HTMLInputElement = document.querySelector(
  '#room-name',
) as HTMLInputElement
let goPublicButton: HTMLButtonElement = document.querySelector(
  '#go-public',
) as HTMLButtonElement
let goPrivateButton: HTMLButtonElement = document.querySelector(
  '#go-private',
) as HTMLButtonElement
let chatroom: HTMLFormElement | null = document.querySelector('#chatroom')
let chatlog: HTMLDivElement | null = document.querySelector('#chatlog')
let chatInput: HTMLInputElement | null = document.querySelector('#chat-input')
let roster: HTMLDivElement | null = document.querySelector('#roster')

// Is the chatlog scrolled to the bottom?
let isAtBottom = true

let username: string = ''
let roomname: string = ''

let hostname = window.location.host
if (hostname === '') {
  // Probably testing the HTML locally.
  hostname = 'edge-chat-demo.cloudflareworkers.com'
}

function startNameChooser() {
  console.log('startNameChooser')
  if (!nameForm) {
    console.error('nameForm not found')
    return
  }

  if (!nameInput) {
    console.error('nameInput not found')
    return
  }

  nameForm.addEventListener('submit', (event: Event) => {
    event.preventDefault()
    username = nameInput!.value || ''
    if (username.length > 0) {
      startRoomChooser()
    }
  })

  nameInput.addEventListener('input', (event: Event) => {
    const target = event.currentTarget
    if (!(target instanceof HTMLInputElement)) {
      return
    }
    if (target.value.length > 32) {
      target.value = target.value.slice(0, 32)
    }
  })

  nameInput.focus()
}

function startRoomChooser() {
  nameForm?.remove()

  if (document.location.hash.length > 1) {
    roomname = document.location.hash.slice(1)
    startChat()
    return
  }

  roomForm?.addEventListener('submit', (event: Event) => {
    event.preventDefault()
    roomname = roomNameInput.value
    if (roomname.length > 0) {
      startChat()
    }
  })

  roomNameInput.addEventListener('input', (event: Event) => {
    const target = event.currentTarget
    if (!(target instanceof HTMLInputElement)) {
      return
    }
    if (target.value.length > 32) {
      target.value = target.value.slice(0, 32)
    }
  })

  goPublicButton.addEventListener('click', (event: Event) => {
    roomname = roomNameInput.value
    if (roomname.length > 0) {
      startChat()
    }
  })

  goPrivateButton.addEventListener('click', async (event: Event) => {
    roomNameInput.disabled = true
    goPublicButton.disabled = true
    ;(event.currentTarget as HTMLButtonElement).disabled = true

    let response = await fetch('https://' + hostname + '/api/room', {
      method: 'POST',
    })
    if (!response.ok) {
      alert('something went wrong')
      document.location.reload()
      return
    }
    roomname = await response.text()
    startChat()
  })

  roomNameInput.focus()
}

function startChat() {
  roomForm?.remove()

  // Normalize the room name a bit.
  roomname = roomname
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .replace(/_/g, '-')
    .toLowerCase()

  if (roomname.length > 32 && !roomname.match(/^[0-9a-f]{64}$/)) {
    addChatMessage('ERROR', 'Invalid room name.')
    return
  }

  document.location.hash = '#' + roomname

  chatInput?.addEventListener('keydown', (event: KeyboardEvent) => {
    if (!chatlog) return
    if (event.keyCode === 38) {
      // up arrow
      chatlog.scrollBy(0, -50)
    } else if (event.keyCode === 40) {
      // down arrow
      chatlog.scrollBy(0, 50)
    } else if (event.keyCode === 33) {
      // page up
      chatlog.scrollBy(0, -chatlog.clientHeight + 50)
    } else if (event.keyCode === 34) {
      // page down
      chatlog.scrollBy(0, chatlog.clientHeight - 50)
    }
  })

  chatroom?.addEventListener('submit', (event: Event) => {
    event.preventDefault()
    if (currentWebSocket && chatInput && chatlog) {
      currentWebSocket.send(JSON.stringify({ message: chatInput.value }))
      chatInput.value = ''

      // Scroll to bottom whenever sending a message.
      chatlog.scrollBy(0, 1e8)
    }
  })

  chatInput?.addEventListener('input', (event: Event) => {
    const target = event.currentTarget
    if (target instanceof HTMLInputElement && target.value.length > 256) {
      target.value = target.value.slice(0, 256)
    }
  })

  chatlog?.addEventListener('scroll', (event: Event) => {
    if (!chatlog) return
    isAtBottom =
      chatlog.scrollTop + chatlog.clientHeight >= chatlog.scrollHeight
  })

  chatInput?.focus()
  document.body.addEventListener('click', (event: Event) => {
    if (window.getSelection()?.toString() === '') {
      chatInput?.focus()
    }
  })

  // Detect mobile keyboard appearing and disappearing, and adjust the scroll as appropriate.
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function (event: Event) {
      if (isAtBottom && chatlog) {
        chatlog.scrollBy(0, 1e8)
      }
    })
  }

  join()
}

let lastSeenTimestamp = 0
let wroteWelcomeMessages = false

function join() {
  // If we are running via wrangler dev, use ws:
  const wss = document.location.protocol === 'http:' ? 'ws://' : 'wss://'
  let ws = new WebSocket(
    wss + hostname + '/api/room/' + roomname + '/websocket',
  )
  let rejoined = false
  let startTime = Date.now()

  let rejoin = async () => {
    if (!rejoined) {
      rejoined = true
      currentWebSocket = null

      // Clear the roster.
      if (roster) {
        while (roster.firstChild) {
          roster.removeChild(roster.firstChild)
        }
      }

      // Don't try to reconnect too rapidly.
      let timeSinceLastJoin = Date.now() - startTime
      if (timeSinceLastJoin < 10000) {
        // Less than 10 seconds elapsed since last join. Pause a bit.
        await new Promise((resolve) =>
          setTimeout(resolve, 10000 - timeSinceLastJoin),
        )
      }

      // OK, reconnect now!
      join()
    }
  }

  ws.addEventListener('open', (event: Event) => {
    currentWebSocket = ws
    // Send user info message.
    ws.send(JSON.stringify({ name: username }))
  })

  ws.addEventListener('message', (event: MessageEvent) => {
    let data = JSON.parse(event.data)
    if (data.error) {
      addChatMessage(null, '* Error: ' + data.error)
    } else if (data.joined) {
      let p = document.createElement('p')
      p.innerText = data.joined
      roster?.appendChild(p)
    } else if (data.quit) {
      if (roster) {
        for (let child of Array.from(roster.childNodes)) {
          if ((child as HTMLElement).innerText === data.quit) {
            roster.removeChild(child)
            break
          }
        }
      }
    } else if (data.ready) {
      // All pre-join messages have been delivered.
      if (!wroteWelcomeMessages) {
        wroteWelcomeMessages = true
        addChatMessage(
          null,
          '* This is a demo app built with Cloudflare Workers Durable Objects. The source code ' +
            'can be found at: https://github.com/cloudflare/workers-chat-demo',
        )
        addChatMessage(
          null,
          '* WARNING: Participants in this chat are random people on the internet. ' +
            'Names are not authenticated; anyone can pretend to be anyone. The people ' +
            'you are chatting with are NOT Cloudflare employees. Chat history is saved.',
        )
        if (roomname.length === 64) {
          addChatMessage(
            null,
            '* This is a private room. You can invite someone to the room by sending them the URL.',
          )
        } else {
          addChatMessage(null, '* Welcome to #' + roomname + '. Say hi!')
        }
      }
    } else {
      // A regular chat message.
      if (data.timestamp > lastSeenTimestamp) {
        addChatMessage(data.name, data.message)
        lastSeenTimestamp = data.timestamp
      }
    }
  })

  ws.addEventListener('close', (event: CloseEvent) => {
    console.log('WebSocket closed, reconnecting:', event.code, event.reason)
    rejoin()
  })
  ws.addEventListener('error', (event: Event) => {
    console.log('WebSocket error, reconnecting:', event)
    rejoin()
  })
}

function addChatMessage(name: string | null, text: string) {
  let p = document.createElement('p')
  if (name) {
    let tag = document.createElement('span')
    tag.className = 'username'
    tag.innerText = name + ': '
    p.appendChild(tag)
  }
  p.appendChild(document.createTextNode(text))

  // Append the new chat line, making sure that if the chatlog was scrolled to the bottom
  // before, it remains scrolled to the bottom, and otherwise the scroll position doesn't
  // change.
  chatlog?.appendChild(p)
  if (isAtBottom) {
    chatlog?.scrollBy(0, 1e8)
  }
}

startNameChooser()
