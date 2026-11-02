# Third-party notices

**Chess pieces**

The cburnett pieces are by Colin M. L. Burnett.
Their existing BSD notice accompanies the files:
`code/app/frontend/public/pieces/cburnett/LICENSE.txt`.

**Training data**

The bundled game and puzzle packs derive from Lichess exports.
Lichess publishes these exports under [CC0](https://database.lichess.org/).

Opening names derive from the Lichess openings dataset.
Its [CC0 notice](https://github.com/lichess-org/chess-openings/blob/master/COPYING.txt) accompanies the original dataset.

The app bundles processed packs, not the original downloads.
The processing scripts remain in `code/app/core/scripts/`.

**Bundled dependencies**

- [chess.js 1.4.0](code/app/frontend/public/licenses/chess-js.txt): BSD-2-Clause.
- [js-chess-engine 2.4.6](code/app/frontend/public/licenses/js-chess-engine.txt): MIT.
- [React](code/app/frontend/public/licenses/react.txt): MIT.
- [React DOM](code/app/frontend/public/licenses/react-dom.txt): MIT.
- [Scheduler](code/app/frontend/public/licenses/scheduler.txt): MIT.

Their complete notices ship with the source and public game.
The package lockfiles record exact dependency versions.

These notices do not license this project's original code.
