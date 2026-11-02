# Blindfold Chess

I made this to practise blindfold chess.
It has short exercises for playing without seeing the pieces.

**[Play in your browser](https://ceasar369.github.io/blindfold-chess/)**
· [Download the source](https://github.com/Ceasar369/blindfold-chess/archive/refs/heads/main.zip)

![A board-coordinate exercise in Blindfold Chess](docs/images/training.jpg)

**What you can practise**

- Board coordinates and square colours.
- Piece movement and legal moves.
- Reading and writing chess notation.
- Remembering positions after the board hides.
- Updating positions as moves arrive.
- Blind play, from puzzles to games against a bot.

**Why I made it**

I wanted a trainer for my own practice.
I tried my [Claude setup](https://github.com/Ceasar369/claude-behavior-layer) on this separate project.
It worked well for me here too.
I’ve shared the game in case someone else enjoys it.

**Run it locally**

Install Node.js 24, which includes npm.
Download this repository and open its folder in Terminal.

```sh
npm run setup
npm start
```

Open [the local game](http://127.0.0.1:4710).
Press Ctrl+C in Terminal to stop it.
The first setup downloads dependencies; playing needs no cloud account.

**Your progress**

The public game saves scores and progress in your browser.
Use the same browser and device to continue.
Clearing this site's browser data removes that progress.

The downloaded edition also saves completed rounds as local files.
Those files stay in this folder's `.data/records/` directory.
Back up `.data/` before moving or deleting your copy.

The launcher uses ports 4710 and 4711.
It keeps this copy separate from my personal installation.
It serves only this computer, through `127.0.0.1`.

**Inside the source**

- `code/app/core`: exercises, chess rules, and bundled training packs.
- `code/app/frontend`: React interface and browser progress.
- `code/app/backend`: local progress storage and optional cloud implementation.
- `code/blueprint/docs`: chapter descriptions used by existing tests.

Run `npm test`, `npm run check`, and `npm run build`.
The screenshot shows the existing interface without a redesign.

`npm run build:pages` builds the public, browser-only edition.
GitHub Actions checks, builds, and publishes it after changes.
The local edition retains its optional progress server.

**Credits and license**

Training packs use [Lichess's public data](https://database.lichess.org/).
[Third-party notices](THIRD_PARTY_NOTICES.md) identify bundled assets and dependencies.
MIT license. See [LICENSE](LICENSE).
