# Fullstack User Activity Tracker

A lightweight, robust, and highly optimized user activity tracking system (analogous to a simplified Google Analytics or Mixpanel). It consists of a client-side JavaScript/TypeScript tracking library and a high-performance backend ingestion service.

This repository was developed as a full-stack engineering test task, implemented with a focus on web performance, data integrity, and clean architecture.

> [!NOTE]
> For the complete, detailed project requirements and task specifications, please refer to the [TASK.md](./TASK.md) file.

---

## 💡 My Solution & Experience

I chose to implement the project following the **Bonus Track** guidelines, as I had previously built a similar Preact-based widget MVP and understood the concepts.

### Challenges Encountered

1. **Developer Experience Configuration:** Setting up the codebase and building scripts to compile, bundle, watch, and run the client-side tracker, Fastify backend, and static demo server concurrently.
2. **Testing Asynchronous Operations:** Writing comprehensive tests for the tracker's buffer and debounce timeouts using mock clocks. Working with timeouts and fake timers in Vitest required rigorous testing to ensure robustness.

### Time Spent: ~25 hours

- **5 hours:** Researching tracker design patterns and Fastify.
- **10 hours:** Structuring the codebase, configuring the TypeScript build pipeline, and polishing file organization.
- **10 hours:** Implementing the tracker, backend routes, database repository, and writing Vitest tests.

### Implementation Details: GA-style Snippet Loader

To prevent page rendering blocks, the tracker is initialized using a lightweight inline JavaScript snippet. It dynamically injects the script tag asynchronously and creates a temporary `window.tracker` queue (`tracker.q`). Any tracker calls made prior to the bundle loading are cached locally, and then processed in chronological order once the main bundle executes and initializes.

---

## 🚀 Key Features of the Implementation

### Client-Side Tracker (`tracker/`)

- **Non-Blocking Async Initialization:** Dynamic script injection via an IIFE snippet prevents rendering blocks.
- **Smart Batching & Debouncing:** Buffers events locally to reduce HTTP request overhead. Flushes the buffer when it reaches a threshold of **3 events**, or when **1 second** has elapsed since the last transmission.
- **Reliable Unload Tracking:** Captures exit events (e.g., page navigation or tab close) using the `visibilitychange` (`pagehide`) event. Transmits remaining events safely using `fetch` with `keepalive: true` to prevent data loss without blocking the UI thread.
- **Offline Resilience & Network Retry:** Detects network connection issues, buffers failed requests, waits for 1 second, and prepends failed events back to the queue to preserve chronological sequence.
- **CORS Preflight Optimization:** Transmits data using `POST` with `Content-Type: text/plain`, bypassing the browser's CORS preflight (`OPTIONS` request) to optimize request latency and server load.
- **Timezone-Aware Timestamps:** Captures accurate local user event timestamps normalized to UTC Unix epoch seconds.

### Backend Ingestion Service (`src/`)

- **High-Performance Fastify Server:** Built on **Fastify** for ultra-low latency and high throughput.
- **Non-Blocking Database Writes:** Immediately returns a `200 OK` status to the client once the payload validation succeeds, performing the MongoDB bulk insertion asynchronously in the background.
- **Robust Validation:** Uses **Zod** schemas to validate incoming payloads, responding with `422 Unprocessable Entity` for malformed formats.
- **Isolated Testing:** Tests are run using **Vitest** with an in-memory database (`mongodb-memory-server`) to ensure zero-dependency, isolated, and repeatable test runs.

---

## 🛠️ Tech Stack

- **Frontend:** TypeScript, esbuild (for IIFE compilation & minification)
- **Backend:** Node.js, Fastify, TypeScript, Zod
- **Database:** MongoDB
- **Testing:** Vitest, Happy DOM, MongoDB Memory Server

---

## 📁 Repository Structure

```
├── demo/                   # Demo HTML files for browser testing (ports: 50000)
├── tracker/                # Client-side tracking library source code
│   ├── tracker.ts          # Core tracking and batching logic
│   ├── index.ts            # Library entry point & window binding
│   └── tracker.test.ts     # Client-side unit tests (with Happy DOM)
├── src/                    # Backend server source code (port: 8888)
│   ├── plugins/            # Fastify plugins (env, mongodb, static)
│   ├── routes/             # API routes (/track endpoint)
│   ├── apps/               # Business logic & repository layers
│   ├── app.ts              # App loader (registering plugins, routes, apps)
│   └── server.ts           # Server entry point
├── scripts/                # Development, build, and cleanup scripts
├── server.http             # HTTP Client file for testing routes
└── tests/                  # Integration tests for backend endpoints
```

---

## ⚙️ Getting Started

### Prerequisites

- Node.js (>= 22.15.0)
- MongoDB running locally (default: `mongodb://localhost:27017`) or configured via `.env`

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-dir>
   ```
2. Install dependencies:
   ```bash
   npm ci
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   _(Optional)_ Customize variables inside `.env` (e.g., `PORT`, `MONGODB_URI`, `MONGODB_NAME`).

### Running the Application

To run the entire ecosystem (the backend ingestion server, client bundle builder, and static demo pages) concurrently in development mode:

```bash
npm run dev
# OR: npm run demo
```

This script will:

- Compile the TypeScript server to `dist/`.
- Compile and watch the tracker script using `esbuild`, outputting the bundle to `public/tracker.js`.
- Start the Fastify backend server on `http://localhost:8888`.
- Start a static file server to host the demo site on `http://localhost:50000`.

Open `http://localhost:50000/index.html` in your browser, click the links or buttons, and observe the tracked events being recorded in the console and your MongoDB database.

---

## 🧪 Testing & Formatting

The repository is equipped with comprehensive automated unit and integration tests.

### Run Backend Route Tests

Runs integration tests against the Fastify API using an in-memory MongoDB instance:

```bash
npm run test
```

### Run Client Tracker Tests

Runs client-side tracking, batching, and network retry tests utilizing mocked timers and Happy DOM:

```bash
npm run test:tracker
```

### Code Formatting

Ensure code style consistency using Prettier:

```bash
npm run format
```

---

## 💡 Technical Design Decisions & Details

### 1. Preflight CORS Request Bypass

Standard cross-origin `application/json` requests trigger a browser `OPTIONS` preflight request. To eliminate this latency penalty, the tracker sends payloads as `Content-Type: text/plain` with a stringified JSON body. The Fastify backend reads the body as a raw string and parses it manually. This ensures that only a single `POST` request is sent, reducing client latency and server load.

### 2. Google Analytics-style Loading Snippet

The tracker is embedded using an asynchronous snippet pattern. This script dynamically creates a script tag pointing to `http://localhost:8888/tracker.js`. Before the script loads, it creates a fallback global `window.tracker` object that stores tracking calls in a queue array (`tracker.q`). Once the real library loads, it processes the queued events and replaces the proxy function, ensuring zero data loss during page load.

### 3. Bulletproof Exit Event Capture

Traditional unload listeners (`unload` or `beforeunload`) are unreliable on mobile browsers and block page caching (bfcache). This tracker uses the modern `visibilitychange` listener. When the page visibility state changes to `hidden` (tab closed, minimized, or navigation occurring), the tracker fires a final `pagehide` event and flushes all pending buffer events using `fetch` with `keepalive: true`.
