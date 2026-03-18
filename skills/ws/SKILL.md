---
name: ws
description: Add WebSocket support to the Go backend with typed message protocol and auto-generated frontend client. Use when adding real-time features like chat, notifications, or live updates.
argument-hint: [feature-name]
---

# gopilot:ws — Add WebSocket Support

You are adding WebSocket support for real-time features. The backend manages a hub with rooms/subscriptions, and the frontend gets a typed client.

## Before Starting

1. Read `skills/_shared/go-patterns.md` for conventions
2. Check if WebSocket hub already exists at `backend/internal/ws/`

## Phase 1: WebSocket Hub (if not exists)

Create `backend/internal/ws/`:

### hub.go
```go
package ws

import "sync"

type Hub struct {
    mu          sync.RWMutex
    clients     map[string]*Client       // connID -> client
    rooms       map[string]map[string]*Client // roomID -> connID -> client
}

func NewHub() *Hub { ... }
func (h *Hub) Register(client *Client) { ... }
func (h *Hub) Unregister(client *Client) { ... }
func (h *Hub) Subscribe(client *Client, room string) { ... }
func (h *Hub) Unsubscribe(client *Client, room string) { ... }
func (h *Hub) Broadcast(room string, msg []byte) { ... }
func (h *Hub) SendTo(connID string, msg []byte) { ... }
```

### client.go
```go
package ws

import "github.com/gorilla/websocket"

type Client struct {
    ID     string
    UserID string
    Conn   *websocket.Conn
    Hub    *Hub
    Send   chan []byte
}

func (c *Client) ReadPump() { ... }  // reads from WS, routes to handler
func (c *Client) WritePump() { ... } // writes from Send channel to WS
```

### messages.go — Typed Protocol
```go
package ws

type MessageType string

const (
    // Client → Server
    MsgSubscribe   MessageType = "subscribe"
    MsgUnsubscribe MessageType = "unsubscribe"
    // Add feature-specific message types here
)

type IncomingMessage struct {
    Type    MessageType     `json:"type"`
    Payload json.RawMessage `json:"payload"`
}

type OutgoingMessage struct {
    Type    MessageType `json:"type"`
    Payload interface{} `json:"payload"`
}
```

## Phase 2: Register WebSocket Endpoint

In `backend/internal/api/router.go`, add:
```go
hub := ws.NewHub()
r.Get("/ws", handleWebSocket(hub))
```

Tag WebSocket operations in Huma for OpenAPI generation so the SDK generator can create typed clients.

## Phase 3: Frontend WebSocket Client

The SDK generator will handle this via `/gopilot:sdk`. The generated client will have:
- Typed `send*()` methods matching server message types
- Typed `on*()` handlers matching server broadcast types
- Auto-reconnect with exponential backoff
- Room subscription management

## What NOT to Do
- Do NOT use raw string message types — always typed constants
- Do NOT skip the hub pattern — direct connection management doesn't scale
- Do NOT put business logic in WebSocket handlers — call services
