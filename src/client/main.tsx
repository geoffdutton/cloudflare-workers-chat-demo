// import './styles.css?inline'
import { render } from 'hono/jsx/dom'
import { ChatLayout } from './ChatLayout'

const root = document.getElementById('app')!
render(<ChatLayout />, root)
