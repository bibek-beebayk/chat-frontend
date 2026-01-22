# Chat Application Frontend

Next.js frontend for a real-time chat application with WebSocket support and beautiful UI.

## Features

- **Modern UI**: Deep Purple Casino theme with glassmorphism effects
- **User Authentication**: Login and registration with role-based access
- **Real-Time Chat**: WebSocket-powered instant messaging
- **Responsive Design**: Mobile-friendly and adaptive layouts
- **Role-Based Access**: Different views for Players, Agents, and Staff
- **Staff Dashboard**: Dedicated dashboard for staff members
- **TypeScript**: Full type safety throughout the application

## Technology Stack

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **CSS Modules**: Scoped styling
- **WebSocket**: Real-time communication
- **React Context**: State management

## Prerequisites

- Node.js 18+ and npm
- Backend server running (see chat-backend)

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

The `.env.local` file is already configured with default values:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

Update these if your backend runs on different URLs.

## Running the Application

### Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Production Build

```bash
npm run build
npm run start
```

## Pages

### Public Pages
- `/login` - User login
- `/register` - User registration

### Protected Pages (Require Authentication)
- `/` - Home page with feature cards
- `/chat` - Real-time chat with room selection
- `/payments` - Payment information and history
- `/staff-dashboard` - Staff dashboard (staff only)

## User Roles

### Player
- Access to chat rooms
- Can message with staff
- View payment information

### Agent
- Access to chat rooms
- Can message with staff
- View payment information

### Staff
- Assigned to one chat room
- Access to staff dashboard
- View statistics and manage chat

## Project Structure

```
chat-frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page
│   │   ├── login/              # Login page
│   │   ├── register/           # Register page
│   │   ├── chat/               # Chat page
│   │   ├── payments/           # Payments page
│   │   └── staff-dashboard/    # Staff dashboard
│   ├── components/             # Reusable components
│   │   ├── forms/              # Form components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Select.tsx
│   │   └── layout/             # Layout components
│   │       └── Header.tsx
│   ├── contexts/               # React contexts
│   │   └── AuthContext.tsx
│   ├── hooks/                  # Custom hooks
│   │   └── useWebSocket.ts
│   ├── lib/                    # Utilities
│   │   └── api.ts
│   ├── styles/                 # Global styles
│   │   └── globals.css
│   └── types/                  # TypeScript types
│       └── index.ts
├── package.json
├── tsconfig.json
└── next.config.js
```

## Design System

### Colors
- **Primary**: Deep Purple (`hsl(266, 60%, 50%)`)
- **Secondary**: Pink (`hsl(330, 70%, 55%)`)
- **Accent**: Gold (`hsl(45, 100%, 55%)`)
- **Background**: Dark (`hsl(240, 20%, 8%)`)

### Components
- Glassmorphism effects with backdrop blur
- Gradient buttons and text
- Smooth animations and transitions
- Responsive layouts

### Typography
- Font Family: Inter (Google Fonts)
- Hierarchy with proper heading sizes
- Readable line-heights

## Key Features

### Authentication
- Session-based authentication with HTTP-only cookies
- Persistent login state with localStorage
- Automatic redirect for protected routes

### Real-Time Chat
- WebSocket connection to backend
- Automatic reconnection on disconnect
- Live message updates
- Connection status indicator
- Message history loading

### Components
- Reusable form components (Button, Input, Select)
- Modular CSS with CSS Modules
- Type-safe props with TypeScript
- Accessible and responsive

## Development Notes

- Backend must be running for full functionality
- WebSocket requires authentication (session cookies)
- All routes except login/register require authentication
- Staff dashboard is only accessible to staff users

## Production Deployment

For production deployment:

1. Build the application:
   ```bash
   npm run build
   ```

2. Set production environment variables
3. Deploy to your hosting platform (Vercel, Netlify, etc.)
4. Ensure CORS is properly configured on the backend
5. Update `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL`

## Troubleshooting

### WebSocket Connection Issues
- Ensure backend is running
- Check WebSocket URL in `.env.local`
- Verify user is authenticated

### Authentication Issues
- Clear browser cookies and localStorage
- Check backend CORS configuration
- Verify session cookie is being sent

### Build Errors
- Delete `.next` folder and `node_modules`
- Run `npm install` again
- Check for TypeScript errors
