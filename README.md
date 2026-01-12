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
- Supports 20 disks by default but can we changed in config.ts

## Environment Variables

| Variable            | Description     | Default                 |
| ------------------- | --------------- | ----------------------- |
| `REACT_APP_API_URL` | Backend API URL | `http://localhost:3001` |

## Deployed to render: https://hanoi-frontend-mg5x.onrender.com/

## Scripts

| Command         | Description              |
| --------------- | ------------------------ |
| `npm start`     | Start development server |
| `npm run build` | Create production build  |
| `npm test`      | Run tests                |

## Tech Stack

- React 18
- TypeScript
- Tailwind CSS
- Create React App
