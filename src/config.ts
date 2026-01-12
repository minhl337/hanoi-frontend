// Game configuration constants
export const MAX_DISK = 20
export const MAX_MOVES = 2 ** MAX_DISK - 1 // 2^n - 1 for n disks
export const ANIMATION_SPEED = 500 // ms per move

// Messages
export const SUMMARY_MESSAGE = `Too many moves to list or auto-solve. Reduce n to ${MAX_DISK} or less.`

// API
export const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001"
