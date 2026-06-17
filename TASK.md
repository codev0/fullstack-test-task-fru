# Project Assignment Description (Translated from Notion)

We will write a tracking service for visitor activity in the browser. As a visitor navigates through the website and clicks buttons, logs of their activity are saved on the server.

**Stack:** Node.js, TypeScript, and MongoDB.

### 1. Client

The same page should be served at the following addresses:

- `http://localhost:50000/1.html`
- `http://localhost:50000/2.html`
- `http://localhost:50000/3.html`

The HTML template structure for these pages:

```html
<html>
  <head>
    <title>My website</title>
    <script src="http://localhost:8888/tracker"></script>
    <script>
      tracker.track("pageview");
      tracker.track("test", "one", "two", "three");
    </script>
  </head>
  <body>
    <button onclick="tracker.track('click-button')">Click me</button>
    <ul>
      <li>
        <a href="/1.html" onclick="tracker.track('click-link', '1')">1.html</a>
      </li>
      <li>
        <a href="/2.html" onclick="tracker.track('click-link', '2')">2.html</a>
      </li>
      <li>
        <a href="/3.html" onclick="tracker.track('click-link', '3', 'three')"
          >3.html</a
        >
      </li>
    </ul>
  </body>
</html>
```

The browser tracker's JavaScript code will be served at `http://localhost:8888/tracker`.

#### Tracker Logic

The tracker has a single public method implementing the following interface:

```typescript
interface Tracker {
  track(event: string, ...tags: string[]): void;
}
```

For each invocation of this method, the new event is pushed to a buffer. In addition to the passed data, the event must include:

- `url` — the full URL of the page.
- `title` — the content of the `<title>` tag of the current page.
- `ts` — the user's local time in Unix epoch seconds.

This yields an event format like this:

```json
{
  "event": "pageview",
  "tags": [],
  "url": "http://localhost:50000/1.html",
  "title": "My website",
  "ts": 1675209600
}
```

Events are sent to the backend as an array using the `POST` method at `http://localhost:8888/track`.

We want to send the data to the backend as quickly as possible while minimizing the number of HTTP requests. To achieve this:

- Events are added to a buffer as they occur.
- The buffer is sent to the backend as soon as events appear in it, but no more frequently than once per second, OR when there are at least 3 events in the buffer, OR when the browser is closed.
- If sending events fails due to network issues, wait for one second and return the events back to the buffer. From there, they will be retried according to the general rules.

#### Bonus Track (Optional Requirements)

These are optional requirements. Complete them if the test assignment feels too simple:

- Write your own tracker insertion snippet for the page, replacing `<script src="http://localhost:8888/tracker"></script>`, and explain why "everything was made so complicated".
- Ensure that when clicking a link, all events manage to be sent to the backend before the page navigates.
- Make sure that no CORS preflight `OPTIONS` request is triggered for the cross-origin tracking request.

### 2. Backend

- The application can use any microframework (Fastify, Express, Koa, etc.) or pure `http`. Do not use NestJS or other heavy frameworks.
- The application listens on ports `50000` and `8888` and handles the requests described above.
- Upon receiving an array of events at `http://localhost:8888/track`, the application inserts them into the MongoDB collection `tracks`. One document per event. Multiple events must be inserted in a single query.
- Incoming requests are validated against the event format described above. If validation succeeds, respond with `200 OK`; otherwise, respond with `422 Unprocessable Entity`.
- The application responds to the client immediately, without waiting for the database insertion to complete.

### 3. Technical Requirements

- The tracker must work in the latest version of Chrome. Do not worry about legacy browser support.
- MongoDB is used as the database to store events.
- Use TypeScript on both the backend and frontend.
- Do not use heavy architectural patterns. The project is simple; it is better to spend time on code readability and debugging requirements.
- Format the code using Prettier with default settings.
- Include a `README` file in the repository describing the build and execution processes. You do not need to explain how to install MongoDB; it is assumed to be already installed.
- Along with the repository link, provide a brief note on the challenges you faced and the time spent.

### 4. How We Evaluate the Test Task

We inspect the test task very carefully. Two or three developers from our team perform code reviews and make a decision. In the end, it all comes down to these simple criteria:

- The code is simple and easy to read.
- All requirements in the assignment are met.
- There are no bugs.
