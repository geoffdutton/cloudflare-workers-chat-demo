import { FC, PropsWithChildren } from 'hono/jsx'
import { useState } from 'hono/jsx'

interface ChatFormProps {
  formId: string
  formAction: string
  handleSubmit: (newVal: string) => void
}

const ChatForm = ({
  formId,
  formAction,
  children,
  handleSubmit,
}: PropsWithChildren<ChatFormProps>) => {
  const _handleSubmit = (e: Event) => {
    e.preventDefault()
    const newVal = (e.target as HTMLFormElement).value || ''
    handleSubmit(newVal)
  }
  return (
    <form id={formId} action={formAction} onSubmit={_handleSubmit}>
      {children}
    </form>
  )
}

interface FormData {
  username: string
  roomname: string
  chatlog: string[]
  chatInput: string
  roster: string[]
}

export const ChatLayout: FC = ({ children }) => {
  const [formData, setFormData] = useState<FormData>({
    username: '',
    roomname: '',
    chatlog: [],
    chatInput: '',
    roster: [],
  })
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [userNameSubmitted, setUserNameSubmitted] = useState(false)
  console.log('ChatLayout', {
    formData,
    isAtBottom,
    userNameSubmitted,
  })

  const handleOnInput = (e: Event) => {
    const target = e.target as HTMLInputElement
    const newVal = target.value
    setFormData((prev) => ({
      ...prev,
      [target.name]: newVal,
    }))
    if (target.name === 'chatInput') {
      setIsAtBottom(true)
    }
  }

  const { username, roomname, chatlog, chatInput, roster } = formData
  return (
    <>
      <ChatForm
        formId="name-form"
        formAction="/fake-form-action"
        handleSubmit={(newVal) => {
          setFormData((prev) => ({
            ...prev,
            username: newVal,
          }))
        }}
      >
        <input
          id="name-input"
          placeholder="your name"
          value={username}
          onInput={handleOnInput}
        />
        <p>
          This chat runs entirely on the edge, powered by
          <br />
          <a
            href="https://blog.cloudflare.com/introducing-workers-durable-objects"
            target="_blank"
          >
            Cloudflare Workers Durable Objects
          </a>
        </p>
      </ChatForm>
      <ChatForm formId="room-form" formAction="/fake-form-action">
        <p>Enter a public room:</p>
        <input
          id="room-name"
          placeholder="room name"
          value={roomname}
          onInput={handleOnInput}
        />
        <button id="go-public">Go &raquo;</button>
        <p>OR</p>
        <button id="go-private">Create a Private Room &raquo;</button>
      </ChatForm>
      <ChatForm formId="chatroom" formAction="/fake-form-action">
        <div id="chatlog">
          <div id="spacer"></div>
        </div>
        <div id="roster"></div>
        <input id="chat-input" value={chatInput} onInput={handleOnInput} />
      </ChatForm>
    </>
  )
}
