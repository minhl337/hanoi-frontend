# Tower of Hanoi - Frontend

React + TypeScript + Tailwind CSS frontend for the Tower of Hanoi puzzle game.

## Local Development

```bash
npm install
npm start
```

App runs on http://localhost:3000

**Note:** Make sure the backend is running on http://localhost:3001 for API calls to work.

## Features

- Visual Tower of Hanoi with 3 rods (A, B, C)
- Click-to-move manual play
- **Solve** button - shows solution steps without moving disks
- **Auto-solve** button - animates the solution (500ms per move)
- **Reset** button - returns to initial state
- Supports 1-6 disks for full solutions (n > 6 shows summary only)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API URL | `http://localhost:3001` |

## Deploy to Vercel

1. Push this repo to GitHub
2. Import project on [Vercel](https://vercel.com)
3. Add environment variable:
   - `REACT_APP_API_URL` = your Render backend URL (e.g., `https://your-backend.onrender.com`)
4. Deploy

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start development server |
| `npm run build` | Create production build |
| `npm test` | Run tests |

## Tech Stack

- React 18
- TypeScript
- Tailwind CSS
- Create React App
