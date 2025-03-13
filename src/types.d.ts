// Define the session interface
interface ChatRoomSession {
  name?: string
  limiterId: string
  limiter: import('./chat').RateLimiterClient
  blockedMessages: string[]
  quit?: boolean
}
