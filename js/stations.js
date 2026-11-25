/* Sizzle & Serve v2 — the prep stations: the chopping board and the
   stove. Every ingredient that needs work passes through one of
   them on its way from the bin to the pass, and from the pass to
   the plate. The board and the stove are the game's route: while
   one dish's patty fries, the player chops another dish's tomato. */

import { ingredientById } from './recipes.js';

/** Chops needed to finish one item on the board. */
export const CHOPS_TO_FINISH = 3;

/** Seconds on a burner before a fried item is ready. */
export const FRY_READY_SECONDS = 4;

/** Seconds on a burner before a fried item burns. */
export const FRY_BURN_SECONDS = 9;

/** One chopping board: one item at a time, three chops to finish. */
export class ChopBoard {
  constructor() {
    this.item = null; // ingredient id on the board, or null
    this.chops = 0; // chops landed on the current item
    this.done = false; // the item is chopped and waiting on the board
    this.knifeFlash = 0; // seconds of knife animation left
  }

  /** True when the board can take a new item. */
  get free() {
    return this.item === null;
  }

  /** Put an item on the board. Returns false when it is busy. */
  place(id) {
    if (!this.free) return false;
    this.item = id;
    this.chops = 0;
    this.done = false;
    return true;
  }

  /** One chop. Returns 'chopped' when the item is finished, 'busy' when
      it still needs more chops, 'empty' when nothing is on the board,
      and 'done' when a finished item is still waiting to be moved. */
  chop() {
    if (this.item === null) return 'empty';
    if (this.done) return 'done';
    this.chops += 1;
    this.knifeFlash = 0.22;
    if (this.chops >= CHOPS_TO_FINISH) {
      this.done = true;
      return 'chopped';
    }
    return 'busy';
  }

  /** Take the finished item off the board. Returns its id or null. */
  take() {
    if (!this.done) return null;
    const id = this.item;
    this.item = null;
    this.chops = 0;
    this.done = false;
    return id;
  }

  /** The item's display name, or null when the board is empty. */
  get label() {
    return this.item === null ? null : ingredientById(this.item).name;
  }

  update(dt) {
    this.knifeFlash = Math.max(0, this.knifeFlash - dt);
  }
}

/** One burner on the stove: empty, cooking, ready, or burned. */
export class Burner {
  constructor() {
    this.item = null; // ingredient id on the burner, or null
    this.seconds = 0; // seconds the item has been frying
    this.announced = false; // the ready ding has played for this item
  }

  get free() {
    return this.item === null;
  }

  /** The burner's state: 'empty', 'cooking', 'ready', or 'burned'. */
  get state() {
    if (this.item === null) return 'empty';
    if (this.seconds >= FRY_BURN_SECONDS) return 'burned';
    if (this.seconds >= FRY_READY_SECONDS) return 'ready';
    return 'cooking';
  }

  /** Put an item on the burner. Returns false when it is busy. */
  place(id) {
    if (!this.free) return false;
    this.item = id;
    this.seconds = 0;
    this.announced = false;
    return true;
  }

  /** Take the item off the burner, whatever its state. */
  take() {
    const id = this.item;
    this.item = null;
    this.seconds = 0;
    this.announced = false;
    return id;
  }

  update(dt) {
    if (this.item !== null) this.seconds += dt;
  }
}

/** The stove: two burners side by side. */
export class Stove {
  constructor() {
    this.burners = [new Burner(), new Burner()];
  }

  /** Put an item on the first free burner. Returns its index, or -1. */
  place(id) {
    for (let i = 0; i < this.burners.length; i++) {
      if (this.burners[i].place(id)) return i;
    }
    return -1;
  }

  /** True when at least one burner is free. */
  get hasFreeBurner() {
    return this.burners.some((b) => b.free);
  }

  /** True when any burner holds a ready item. */
  get hasReady() {
    return this.burners.some((b) => b.state === 'ready');
  }

  /** True when any burner holds a burned item. */
  get hasBurned() {
    return this.burners.some((b) => b.state === 'burned');
  }

  update(dt) {
    for (const burner of this.burners) burner.update(dt);
  }
}
