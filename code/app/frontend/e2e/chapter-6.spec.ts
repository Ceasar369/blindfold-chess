// Chapter 6 — Blind play: every level of its three cards, at both widths.
// Each card's tests sit in its own file under e2e/chapter-6/.
// Card: code/blueprint/docs/blind-play.md.

import { test } from "@playwright/test";
import { noReload } from "./rounds-5-6.ts";
import "./chapter-6/6.1.1.ts";
import "./chapter-6/6.2.1.ts";
import "./chapter-6/6.3.1.ts";

test.beforeEach(({ page }) => noReload(page));
