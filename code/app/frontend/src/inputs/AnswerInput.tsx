// Block 17, the answer inputs: every way I answer, each handing back an
// answer. The Ask names the input; this picks its screen.

import { ClickMany } from "./ClickMany.tsx";
import { ClickOne } from "./ClickOne.tsx";
import { ClickRoute } from "./ClickRoute.tsx";
import { Choose } from "./Choose.tsx";
import { ComposeMove } from "./ComposeMove.tsx";
import { ComposePosition } from "./ComposePosition.tsx";
import type { InputProps } from "./frame.ts";
import { Keypad } from "./Keypad.tsx";
import { MovePieces } from "./MovePieces.tsx";
import { Place } from "./Place.tsx";
import { PlayMove } from "./PlayMove.tsx";

export function AnswerInput(props: InputProps) {
  switch (props.ask.input.how) {
    case "click-one":
      return <ClickOne {...props} />;
    case "click-many":
      return <ClickMany {...props} />;
    case "click-route":
      return <ClickRoute {...props} />;
    case "choose":
      return <Choose {...props} />;
    case "keypad":
      return <Keypad {...props} />;
    case "compose-move":
      return <ComposeMove {...props} />;
    case "compose-position":
      return <ComposePosition {...props} />;
    case "place":
      return <Place {...props} />;
    case "move":
      return <MovePieces {...props} />;
    case "play-move":
      return <PlayMove {...props} />;
  }
}
