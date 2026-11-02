// What the keypad and the two composers share, from the winner no-typing g1
// v1: a row of keys, the keypad's two rows, and the line showing the answer
// so far.

import type { ReactNode } from "react";
import type { File, Rank, Told } from "../core.ts";

export const FILES = [..."abcdefgh"] as File[];
export const RANKS = [..."12345678"] as Rank[];

// One row of keys, eight to a row. picked: the key held, lit green.
export function Keys<K extends string>({
  keys,
  on,
  off,
  picked,
  label,
}: {
  keys: K[];
  on: (k: K) => void;
  off?: boolean;
  picked?: K | null;
  label: string;
}) {
  return (
    <div className="nt-keys" role="group" aria-label={label}>
      {keys.map((k) => (
        <button key={k} type="button" className={`choice nt-key${picked === k ? " on" : ""}`} disabled={off} onClick={() => on(k)}>
          {k}
        </button>
      ))}
    </div>
  );
}

// A square from the keypad's two rows: the files over the ranks. A file held
// lights; the ranks wait for one. The same file again lets it go. off: both
// rows wait, as the position composer's do for a piece.
export function SquareKeys({
  file,
  onFile,
  onRank,
  off = false,
}: {
  file: File | null;
  onFile: (f: File | null) => void;
  onRank: (r: Rank) => void;
  off?: boolean;
}) {
  return (
    <div className="nt-pad">
      <Keys keys={FILES} on={(f) => onFile(f === file ? null : f)} off={off} picked={file} label="Files" />
      <Keys keys={RANKS} on={onRank} off={off || !file} label="Ranks" />
    </div>
  );
}

// The answer so far, or its empty words while nothing is built. Once told, it
// keeps what I gave, edged by the verdict. move: a move, written bigger.
export function Line({ empty, told, move = false, children }: { empty: string; told: Told | null; move?: boolean; children: ReactNode }) {
  const verdict = told ? (told.verdict === "right" ? " right" : " wrong") : "";
  const blank = children === null || children === "";
  return (
    <div className={`nt-line${move ? " nt-move" : ""}${blank ? " empty" : ""}${verdict}`} role="status" aria-label="Your answer">
      {blank ? empty : children}
    </div>
  );
}
