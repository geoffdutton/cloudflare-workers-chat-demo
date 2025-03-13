import { createMiddleware } from 'hono/factory'

// `handleErrors()` is a little utility function that can wrap an HTTP request handler in a
// try/catch and return errors to the client. You probably wouldn't want to use this in production
// code but it is convenient when debugging and iterating.
export async function handleErrors(
  request: Request,
  func: () => Promise<Response>,
): Promise<Response> {
  try {
    return await func()
  } catch (err) {
    if (request.headers.get('Upgrade') == 'websocket') {
      // Annoyingly, if we return an HTTP error in response to a WebSocket request, Chrome devtools
      // won't show us the response body! So... let's send a WebSocket response with an error
      // frame instead.
      let pair = new WebSocketPair()
      pair[1].accept()
      pair[1].send(
        JSON.stringify({
          error: err instanceof Error ? err.stack : String(err),
        }),
      )
      pair[1].close(1011, 'Uncaught exception during session setup')
      return new Response(null, { status: 101, webSocket: pair[0] })
    } else {
      return new Response(err instanceof Error ? err.stack : String(err), {
        status: 500,
      })
    }
  }
}

export const handleErrorsMiddleware = createMiddleware(async (c, next) => {
  console.log(`handleErrorsMiddleware [${c.req.method}] ${c.req.url}`)
  try {
    await next()
  } catch (err) {
    console.error('handleErrorsMiddleware error', err)
    c.res = undefined // clear the response
    if (c.req.header('Upgrade') == 'websocket') {
      // Annoyingly, if we return an HTTP error in response to a WebSocket request, Chrome devtools
      // won't show us the response body! So... let's send a WebSocket response with an error
      // frame instead.
      const pair = new WebSocketPair()
      pair[1].accept()
      pair[1].send(
        JSON.stringify({
          error: err instanceof Error ? err.stack : String(err),
        }),
      )
      pair[1].close(1011, 'Uncaught exception during session setup')
      c.res = new Response(null, { status: 101, webSocket: pair[0] })
    } else {
      // For non-websocket requests, just return a 500 error with the error message.
      // This is a bit of a hack, but it works for now.
      c.res = new Response(err instanceof Error ? err.stack : String(err), {
        status: 500,
      })
    }
  }
})
