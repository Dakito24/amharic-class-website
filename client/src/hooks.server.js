import app from '../../api/index.js';

export async function handle({ event, resolve }) {
  // If it's an API request, use Express
  if (event.url.pathname.startsWith('/api')) {
    return new Promise((resolvePromise) => {
      // Convert SvelteKit request to Node.js request format
      const req = {
        method: event.request.method,
        url: event.url.pathname + event.url.search,
        headers: Object.fromEntries(event.request.headers),
        body: null
      };

      // Add userId from headers
      const userId = event.request.headers.get('x-user-id');
      if (userId) {
        req.userId = Number(userId);
      }

      // Create response handler
      const res = {
        statusCode: 200,
        _headers: {},
        setHeader(name, value) {
          this._headers[name] = value;
          return this;
        },
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          resolvePromise(new Response(JSON.stringify(data), {
            status: this.statusCode,
            headers: {
              'Content-Type': 'application/json',
              ...this._headers
            }
          }));
        },
        send(data) {
          resolvePromise(new Response(data, {
            status: this.statusCode,
            headers: this._headers
          }));
        },
        sendStatus(code) {
          this.statusCode = code;
          resolvePromise(new Response('', { status: code }));
        }
      };

      // Call Express app
      app(req, res, (err) => {
        if (err) {
          console.error('API error:', err);
          resolvePromise(new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }));
        }
      });
    });
  }

  // For all other requests, use normal SvelteKit handling
  return resolve(event);
}
