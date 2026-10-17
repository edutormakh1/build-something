"use client";

import { STILLS, type Tone } from "./tone";

export default function TransitVeil({ tone }: { tone: Tone }) {
  return (
    <div className="bs-transit" aria-hidden="true">
      <div className="bs-scene" data-tone={tone}>
        <img className="bs-still" src={STILLS[tone].environmentMark} alt="" />
      </div>
    </div>
  );
}
