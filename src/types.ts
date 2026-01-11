export type RodName = "A" | "B" | "C";

export interface Rods {
  A: number[];
  B: number[];
  C: number[];
}

export interface Move {
  step: number;
  disk: number;
  from: RodName;
  to: RodName;
}

export interface CachedSolution {
  stateKey: string;
  moves: Move[];
  moveCount: string;
  mode: "full" | "summary";
}

export interface FullSolutionResponse {
  mode: "full";
  moveCount: string;
  moves: Move[];
}

export interface SummarySolutionResponse {
  mode: "summary";
  moveCount: string;
  message: string;
}

export type SolveResponse = FullSolutionResponse | SummarySolutionResponse;
