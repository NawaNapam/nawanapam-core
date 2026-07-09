# NawaNapam.website

> **PROPRIETARY - INTERNAL USE ONLY**  
> This codebase is proprietary and confidential. Access and usage are restricted to authorized employees of NawaNapam organization only. Unauthorized access, use, distribution, or reproduction is strictly prohibited.

A modern, real-time anonymous video chat platform built with Next.js and Socket.IO. Connect with random strangers worldwide through instant video calls with end-to-end privacy.

## Features

- **Anonymous Video Chat**: Connect with strangers instantly without revealing your identity
- **Smart Matching**: Gender-based filtering (random, male, female) for better matching
- **Real-time Communication**:
  - WebRTC-powered HD video and audio streaming
  - Live text chat during video sessions
  - Instant connection in under 3 seconds
- **Privacy First**:
  - No profile creation required
  - Anonymous authentication support
  - Secure session management
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Progressive Web App (PWA)**: Install and use as a native app
- **Admin Dashboard**: Comprehensive moderation and analytics tools
- **User Management**: Report system, moderation logs, and user banning

## Tech Stack

### Frontend

- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, TailwindCSS, Radix UI
- **Real-time**: Socket.IO Client
- **Authentication**: NextAuth.js with Prisma adapter
- **Database ORM**: Prisma
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod validation
- **Video/Audio**: WebRTC, getUserMedia API
- **Styling**: Framer Motion, Tailwind Animate

### Backend

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **WebSocket**: Socket.IO
- **Database**: Redis (for real-time matching and session management)
- **Security**: Helmet, CORS, Rate Limiting
- **Validation**: Express Validator

### Database

- **Primary DB**: PostgreSQL (via Prisma)
- **Cache/Sessions**: Redis (ioredis)

## Project Structure

```
├── be/                          # Backend server
│   ├── src/
│   │   ├── app.ts              # Express app setup
│   │   ├── index.ts            # Server entry point
│   │   ├── socket/             # Socket.IO handlers
│   │   │   ├── authHandler.ts
│   │   │   ├── matchHandler.ts
│   │   │   ├── rtchandler.ts
│   │   │   └── chatHandlers.ts
│   │   └── utils/redis/        # Redis utilities
│   └── redis/scripts/          # Lua scripts for atomic operations
│
├── fe/                          # Frontend application
│   ├── src/
│   │   ├── app/                # Next.js app router
│   │   │   ├── (routes)/       # Public routes
│   │   │   ├── (admin)/        # Admin panel
│   │   │   └── api/            # API routes
│   │   ├── components/
│   │   │   ├── custom/         # Custom components
│   │   │   │   ├── VideoChat.tsx
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   └── HeroSection.tsx
│   │   │   └── ui/             # Reusable UI components
│   │   ├── hooks/
│   │   │   ├── SocketProvider.ts
│   │   │   ├── useWebRTC.ts
│   │   │   └── useRoomChat.ts
│   │   ├── lib/                # Utilities
│   │   └── stores/             # Zustand stores
│   └── prisma/
│       └── schema.prisma       # Database schema
```

## Installation

### Prerequisites

- Node.js 20+ and npm/yarn
- PostgreSQL database
- Redis server
- (Optional) ADB for mobile development

### 1. Clone the repository

> **Note**: You must be an authorized employee with repository access.

```bash
git clone https://github.com/NawaNapam/NawaNapam.website.git
cd NawaNapam.website
```

### 2. Backend Setup

```bash
cd be
npm install

# Create .env file
cat > .env << EOF
PORT=8080
REDIS_HOST=localhost
REDIS_PORT=6379
STALE_MS=30000
EOF

# Start the backend
npm run dev
```

### 3. Frontend Setup

```bash
cd fe
npm install

# Create .env file
cat > .env << EOF
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/nawanapam"

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Socket.IO
NEXT_PUBLIC_SIGNALING_URL=http://localhost:8080

# Redis (for rate limiting)
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Email (optional - for notifications)
RESEND_API_KEY=your-resend-key
EOF

# Setup database
npx prisma generate
npx prisma migrate dev

# Start the frontend
npm run dev
```

### 4. Access the application

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8080

## Usage

### For Users

1. **Sign Up/Sign In**: Create an account or sign in (anonymous mode available)
2. **Choose Preference**: Select gender preference (random/male/female)
3. **Start Matching**: Click "Start" to begin finding a chat partner
4. **Video Chat**: Once matched, enjoy HD video chat with text messaging
5. **Next/End**: Skip to next person or end the session

### For Developers

#### Run with ADB (Android Mobile Testing)

```bash
# Frontend
cd fe
npm run dev:mobile

# Backend
cd be
npm run dev:mobile
```

#### Build for Production

```bash
# Frontend
cd fe
npm run build
npm start

# Backend
cd be
npm run build
npm start
```

## Security Features

- **CSRF Protection**: Edge CSRF tokens for forms
- **Rate Limiting**: Upstash Redis-based rate limiting
- **Helmet.js**: Security headers and policies
- **Password Security**: Bcrypt hashing
- **Input Validation**: Zod schemas and express-validator
- **Session Management**: Secure cookie-based sessions
- **Environment Variables**: Sensitive data in .env files

## PWA Features

- Offline support
- Install to home screen
- App-like experience
- Optimized performance
- Background sync
- Push notifications (coming soon)

## Customization

### Styling

- Edit TailwindCSS config in `fe/tailwind.config.ts`
- Custom styles in `fe/src/app/globals.css`
- Theme customization via `next-themes`

### Components

- UI components in `fe/src/components/ui/`
- Custom components in `fe/src/components/custom/`
- Radix UI primitives for accessibility

## Configuration

### Frontend Environment Variables

```env
DATABASE_URL=              # PostgreSQL connection string
NEXTAUTH_URL=             # App URL
NEXTAUTH_SECRET=          # NextAuth secret key
NEXT_PUBLIC_SIGNALING_URL= # Backend Socket.IO URL
UPSTASH_REDIS_REST_URL=   # Redis URL for rate limiting
UPSTASH_REDIS_REST_TOKEN= # Redis token
RESEND_API_KEY=           # Email service API key
```

### Backend Environment Variables

```env
PORT=8080                 # Server port
REDIS_HOST=localhost      # Redis host
REDIS_PORT=6379          # Redis port
STALE_MS=30000           # Stale connection timeout
```

## Database Schema

Key models:

- **User**: User accounts and profiles
- **Account**: OAuth provider accounts
- **Session**: User sessions
- **Room**: Chat rooms
- **Participant**: Room participants
- **Message**: Chat messages
- **Report**: User reports
- **ModerationLog**: Moderation actions
- **Interest**: User interests

See [fe/prisma/schema.prisma](fe/prisma/schema.prisma) for full schema.

## Internal Development Guidelines

> **For Authorized Employees Only**

Please follow these steps when working on the codebase:

1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Commit your changes: `git commit -m 'Add amazing feature'`
3. Push to the branch: `git push origin feature/amazing-feature`
4. Open a Pull Request for team review
5. Await approval from team lead before merging

### Development Guidelines

- Follow TypeScript best practices
- Write meaningful commit messages
- Add comments for complex logic
- Test on multiple devices/browsers
- Ensure accessibility standards
- **Never share code or credentials outside the organization**
- **Always use VPN when accessing production systems**

## License

**Proprietary and Confidential**

This codebase is the exclusive property of NawaNapam organization. All rights reserved.

- No public distribution
- No unauthorized use or modification
- No sharing outside the organization
- Internal use by authorized employees only

For licensing inquiries, contact the legal department.

## Known Issues

- Camera switching on iOS requires page refresh
- Some Android devices need manual permissions
- WebRTC connections may fail on restrictive networks

## Roadmap

- [ ] Group video chat (3+ people)
- [ ] Screen sharing
- [ ] Virtual backgrounds
- [ ] Gifts and reactions
- [ ] Advanced filtering (interests, location)
- [ ] Mobile apps (React Native)
- [ ] AI moderation
- [ ] End-to-end encryption
- [ ] Voice-only mode
- [ ] Recording feature (with consent)

## Internal Support

For issues, questions, or suggestions (employees only):

- **Issues**: [GitHub Issues](https://github.com/NawaNapam/NawaNapam.website/issues) (private repository)
- **Internal Chat**: Contact the development team on Slack/Teams
- **Email**: support@nawanapam.com (internal only)

## Links

- **Website**: [nawanapam.com](https://nawanapam.com)

## Development Team

- **NawaNapam Internal Development Team**
- For team roster and contacts, see internal documentation

## Acknowledgments

- Next.js team for the amazing framework
- Socket.IO for real-time communication
- Prisma for database tooling
- Radix UI for accessible components
- Vercel for hosting and analytics

---

**© 2026 NawaNapam Organization - Proprietary & Confidential**  
**For Internal Use by Authorized Employees Only**
