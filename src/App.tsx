import React, { useState, useCallback, useRef, useEffect } from "react"
import { Rods, RodName, Move, CachedSolution, SolveResponse } from "./types"

// API URL - uses environment variable for deployment, falls back to localhost
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001"

// Constants
const ANIMATION_SPEED = 500 // ms per move
const MAX_MOVES = 100
const SUMMARY_MESSAGE =
  "Too many moves to list or auto-solve. Reduce n to 6 or less."

// Generate a random color for each disk (seeded by disk number for consistency)
const diskColors: Record<number, string> = {}
function getDiskColor(disk: number): string {
  if (!diskColors[disk]) {
    const hue = (disk * 137.508) % 360 // Golden angle for good distribution
    diskColors[disk] = `hsl(${hue}, 70%, 50%)`
  }
  return diskColors[disk]
}

// Compute state key for caching
function computeStateKey(rods: Rods): string {
  return `A:${rods.A.join(",")}|B:${rods.B.join(",")}|C:${rods.C.join(",")}`
}

// Create initial canonical state
function createInitialState(n: number): Rods {
  const disks = Array.from({ length: n }, (_, i) => i + 1)
  return { A: disks, B: [], C: [] }
}

// Validate state on frontend
function isValidState(rods: Rods, n: number): boolean {
  const allDisks = [...rods.A, ...rods.B, ...rods.C]
  if (allDisks.length !== n) return false

  const sorted = [...allDisks].sort((a, b) => a - b)
  for (let i = 0; i < n; i++) {
    if (sorted[i] !== i + 1) return false
  }

  for (const rodName of ["A", "B", "C"] as RodName[]) {
    const rod = rods[rodName]
    for (let i = 0; i < rod.length - 1; i++) {
      if (rod[i] >= rod[i + 1]) return false
    }
  }

  return true
}

// Check if a move is legal
function isLegalMove(rods: Rods, from: RodName, to: RodName): boolean {
  if (from === to) return false
  if (rods[from].length === 0) return false

  const diskToMove = rods[from][0]
  const targetTop = rods[to][0]

  if (targetTop !== undefined && diskToMove > targetTop) return false

  return true
}

// Execute a move (returns new rods state)
function executeMove(rods: Rods, from: RodName, to: RodName): Rods {
  const newRods = {
    A: [...rods.A],
    B: [...rods.B],
    C: [...rods.C],
  }
  const disk = newRods[from].shift()!
  newRods[to].unshift(disk)
  return newRods
}

// Toast component
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50 animate-pulse">
      {message}
    </div>
  )
}

// Rod component
function Rod({
  name,
  disks,
  maxN,
  isSelected,
  onClick,
  disabled,
}: {
  name: RodName
  disks: number[]
  maxN: number
  isSelected: boolean
  onClick: () => void
  disabled: boolean
}) {
  const maxDiskWidth = 160 // max width in pixels
  const minDiskWidth = 30
  const diskHeight = 24
  const rodHeight = (maxN + 1) * diskHeight + 40

  return (
    <div
      className={`flex flex-col items-center cursor-pointer transition-all ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
      onClick={disabled ? undefined : onClick}
    >
      <div className="text-lg font-bold mb-2 text-gray-700">{name}</div>
      <div
        className={`relative flex flex-col items-center justify-end rounded-t ${
          isSelected ? "bg-yellow-200" : "bg-gray-100"
        }`}
        style={{ width: maxDiskWidth + 20, height: rodHeight }}
      >
        {/* The rod pole */}
        <div
          className="absolute bg-gray-600 rounded-t"
          style={{
            width: 8,
            height: rodHeight - 20,
            bottom: 20,
          }}
        />
        {/* Base */}
        <div
          className="absolute bg-gray-700 rounded"
          style={{
            width: maxDiskWidth + 20,
            height: 10,
            bottom: 10,
          }}
        />
        {/* Disks */}
        <div className="absolute bottom-5 flex flex-col-reverse items-center">
          {disks
            .slice()
            .reverse()
            .map((disk, idx) => {
              const width =
                minDiskWidth +
                ((disk - 1) / Math.max(maxN - 1, 1)) *
                  (maxDiskWidth - minDiskWidth)
              return (
                <div
                  key={`${disk}-${idx}`}
                  className="rounded transition-all duration-200"
                  style={{
                    width,
                    height: diskHeight - 4,
                    backgroundColor: getDiskColor(disk),
                    marginBottom: 2,
                  }}
                >
                  <span className="flex items-center justify-center h-full text-white text-sm font-bold">
                    {disk}
                  </span>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}

function App() {
  const [n, setN] = useState<number>(3)
  const [rods, setRods] = useState<Rods>(() => createInitialState(3))
  const [selectedRod, setSelectedRod] = useState<RodName | null>(null)
  const [stepsText, setStepsText] = useState<string[]>([])
  const [cachedSolution, setCachedSolution] = useState<CachedSolution | null>(
    null
  )
  const [isAnimating, setIsAnimating] = useState<boolean>(false)
  const [toast, setToast] = useState<string | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState<number | null>(null)

  const animationRef = useRef<number | null>(null)
  const abortRef = useRef<boolean>(false)
  const stepRefs = useRef<(HTMLLIElement | null)[]>([])

  // Auto-scroll to current step during animation
  useEffect(() => {
    if (currentStepIndex !== null && stepRefs.current[currentStepIndex]) {
      stepRefs.current[currentStepIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      })
    }
  }, [currentStepIndex])

  // Show toast
  const showToast = useCallback((message: string) => {
    setToast(message)
  }, [])

  // Handle n input change - also resets the board
  const handleNChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    if (!isNaN(value) && value >= 1) {
      // Stop any running animation
      abortRef.current = true
      if (animationRef.current) {
        clearTimeout(animationRef.current)
        animationRef.current = null
      }
      setIsAnimating(false)
      setN(value)
      setRods(createInitialState(value))
      setSelectedRod(null)
      setStepsText([])
      setCachedSolution(null)
      setCurrentStepIndex(null)
    }
  }

  // Reset to initial state
  const handleReset = useCallback(() => {
    abortRef.current = true
    if (animationRef.current) {
      clearTimeout(animationRef.current)
      animationRef.current = null
    }
    setIsAnimating(false)
    setRods(createInitialState(n))
    setSelectedRod(null)
    setStepsText([])
    setCachedSolution(null)
    setCurrentStepIndex(null)
  }, [n])

  // Handle rod click (manual play)
  const handleRodClick = useCallback(
    (rodName: RodName) => {
      if (isAnimating) return

      if (selectedRod === null) {
        // First click - select if rod has disks
        if (rods[rodName].length > 0) {
          setSelectedRod(rodName)
        }
      } else {
        // Second click - attempt move
        if (selectedRod === rodName) {
          // Deselect
          setSelectedRod(null)
        } else if (isLegalMove(rods, selectedRod, rodName)) {
          // Legal move
          setRods(executeMove(rods, selectedRod, rodName))
          setSelectedRod(null)
          // Keep cachedSolution and stepsText visible so user can follow along
          // Cache will be checked against current state when Solve/Auto-solve is clicked
        } else {
          // Illegal move
          showToast("Invalid move")
          setSelectedRod(null)
        }
      }
    },
    [isAnimating, selectedRod, rods, showToast]
  )

  // Call backend API
  const callSolveAPI = useCallback(
    async (currentRods: Rods): Promise<SolveResponse | null> => {
      try {
        const response = await fetch(`${API_URL}/api/hanoi/solve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            n,
            to: "C",
            state: currentRods,
            maxMoves: MAX_MOVES,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          showToast(error.message || "Invalid state detected. Please Reset.")
          return null
        }

        return await response.json()
      } catch (error) {
        showToast("Failed to connect to server")
        return null
      }
    },
    [n, showToast]
  )

  // Solve button - show instructions only
  const handleSolve = useCallback(async () => {
    if (isAnimating) return

    // Validate state
    if (!isValidState(rods, n)) {
      showToast("Invalid state detected. Please Reset.")
      return
    }

    const currentStateKey = computeStateKey(rods)

    // Check cache
    if (cachedSolution && cachedSolution.stateKey === currentStateKey) {
      // Reuse cached solution
      if (cachedSolution.mode === "summary") {
        setStepsText([SUMMARY_MESSAGE])
      } else {
        setStepsText(
          cachedSolution.moves.map(
            (m) =>
              `Step ${m.step}: Move disk ${m.disk} from ${m.from} to ${m.to}`
          )
        )
      }
      return
    }

    // Call backend
    const result = await callSolveAPI(rods)
    if (!result) return

    if (result.mode === "summary") {
      setCachedSolution({
        stateKey: currentStateKey,
        moves: [],
        moveCount: result.moveCount,
        mode: "summary",
      })
      setStepsText([SUMMARY_MESSAGE])
    } else {
      setCachedSolution({
        stateKey: currentStateKey,
        moves: result.moves,
        moveCount: result.moveCount,
        mode: "full",
      })
      setStepsText(
        result.moves.map(
          (m) => `Step ${m.step}: Move disk ${m.disk} from ${m.from} to ${m.to}`
        )
      )
    }
  }, [isAnimating, rods, n, cachedSolution, callSolveAPI, showToast])

  // Auto-solve button - animate the solution
  const handleAutoSolve = useCallback(async () => {
    if (isAnimating) return

    // Validate state
    if (!isValidState(rods, n)) {
      showToast("Invalid state detected. Please Reset.")
      return
    }

    const currentStateKey = computeStateKey(rods)
    let moves: Move[] = []

    // Check cache
    if (cachedSolution && cachedSolution.stateKey === currentStateKey) {
      if (cachedSolution.mode === "summary") {
        showToast(SUMMARY_MESSAGE)
        return
      }
      moves = cachedSolution.moves
    } else {
      // Call backend
      const result = await callSolveAPI(rods)
      if (!result) return

      if (result.mode === "summary") {
        setCachedSolution({
          stateKey: currentStateKey,
          moves: [],
          moveCount: result.moveCount,
          mode: "summary",
        })
        showToast(SUMMARY_MESSAGE)
        return
      }

      moves = result.moves
      setCachedSolution({
        stateKey: currentStateKey,
        moves: result.moves,
        moveCount: result.moveCount,
        mode: "full",
      })
    }

    if (moves.length === 0) return

    // Start animation - show all steps upfront
    setIsAnimating(true)
    setSelectedRod(null)
    abortRef.current = false

    // Show all steps immediately
    setStepsText(
      moves.map(
        (m) => `Step ${m.step}: Move disk ${m.disk} from ${m.from} to ${m.to}`
      )
    )

    let currentRods = {
      ...rods,
      A: [...rods.A],
      B: [...rods.B],
      C: [...rods.C],
    }
    let stepIndex = 0

    // Highlight current step during animation
    setCurrentStepIndex(0)

    const animateStep = () => {
      if (abortRef.current || stepIndex >= moves.length) {
        setIsAnimating(false)
        setCurrentStepIndex(null)
        return
      }

      const move = moves[stepIndex]
      currentRods = executeMove(currentRods, move.from, move.to)
      setRods({ ...currentRods })
      setCurrentStepIndex(stepIndex)
      stepIndex++

      animationRef.current = window.setTimeout(animateStep, ANIMATION_SPEED)
    }

    animateStep()
  }, [isAnimating, rods, n, cachedSolution, callSolveAPI, showToast])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 p-8">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-white mb-8">
          Tower of Hanoi
        </h1>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="diskCount" className="font-medium text-gray-700">
                Number of disks:
              </label>
              <input
                id="diskCount"
                type="number"
                min="1"
                value={n}
                onChange={handleNChange}
                disabled={isAnimating}
                className="w-20 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>

            <button
              onClick={handleSolve}
              disabled={isAnimating}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Solve
            </button>

            <button
              onClick={handleAutoSolve}
              disabled={isAnimating}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Auto-solve
            </button>

            <button
              onClick={handleReset}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
            >
              Reset
            </button>
          </div>

          {isAnimating && (
            <p className="mt-4 text-sm text-gray-500 italic">
              Animating... Click Reset to stop.
            </p>
          )}
        </div>

        {/* Tower Board */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex justify-around items-end">
            {(["A", "B", "C"] as RodName[]).map((rodName) => (
              <Rod
                key={rodName}
                name={rodName}
                disks={rods[rodName]}
                maxN={n}
                isSelected={selectedRod === rodName}
                onClick={() => handleRodClick(rodName)}
                disabled={isAnimating}
              />
            ))}
          </div>
          {!isAnimating && (
            <p className="text-center mt-4 text-sm text-gray-500">
              Click a rod to select its top disk, then click another rod to move
              it.
            </p>
          )}
        </div>

        {/* Steps Panel */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between">
            <div className="text-xl font-bold text-gray-800 mb-4">Steps</div>
            <div className="text-xl font-bold text-gray-800 mb-4">
              {stepsText.length}
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {stepsText.length === 0 ? (
              <p className="text-gray-400 italic">
                Click "Solve" to see the solution steps, or "Auto-solve" to
                watch the animation.
              </p>
            ) : (
              <ul className="space-y-1">
                {stepsText.map((step, idx) => (
                  <li
                    key={idx}
                    ref={(el) => (stepRefs.current[idx] = el)}
                    className={`font-mono text-sm px-2 py-1 rounded ${
                      currentStepIndex === idx
                        ? "bg-green-500 text-white font-bold"
                        : currentStepIndex !== null && idx < currentStepIndex
                        ? "text-gray-400 line-through"
                        : "text-gray-700"
                    }`}
                  >
                    {step}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
