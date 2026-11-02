import { expect, type Page } from "@playwright/test";

export const LOOK_NOTE = "Look as long as you like.";

// The look on screen, whatever its kind: the button of its kind, the one note,
// and a clock line naming what its time counts. A look that ends on its own
// shows its countdown alone, and is not walked here.
export async function expectLook(page: Page, button: string, show: { time: "look" | "move"; moves?: number }) {
  const counts = show.time === "look" ? "counted as look time" : show.moves === 0 ? "not counted" : "counted as time per move";
  await expect(page.getByRole("button", { name: button, exact: true })).toBeVisible();
  await expect(page.locator(".look-note")).toHaveText(LOOK_NOTE);
  await expect(page.locator(".sx-look")).toHaveText(new RegExp(`^Looking \\d+:\\d\\d · ${counts}$`));
}
