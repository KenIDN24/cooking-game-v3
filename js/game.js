/* Sizzle & Serve v3 — the game itself: orders, the prep stations,
   the pass, the plate, and the clock. One shift of cooking: tickets
   arrive on the board, the player routes each ingredient — chop it,
   fry it, or plate it straight — builds the dish on the plate, and
   serves it before its timer runs out. Serve right and the combo
   grows; let a ticket expire and a heart is lost.
   v3 adds: a customer face with a mood on every ticket, a hero
   plate (bigger, layered, steaming, gold Ready glow), and VIP
   orders — golden tickets from level 3 that pay double. */

import { INGREDIENTS, RECIPES, ingredientById, recipeFor, matchingCount, missingIngredients, randomRecipe, prepOf, PREP } from './recipes.js';
import { SoundBoard } from './audio.js';
import { ChopBoard, Stove, FRY_READY_SECONDS, FRY_BURN_SECONDS } from './stations.js';
import { drawKitchen, drawIngredientIcon, drawDishStack, drawTicket, drawFlame, drawChopBoard, drawStove, drawPass, roundRect } from './kitchen.js';

const W = 1280;
const H = 720;
const SHIFT_SECONDS = 150;
const MAX_ORDERS = 3;
const MAX_HEARTS = 3;
const MAX_PASS = 3;
const RUSH_CHANCE = 0.25;
/** VIP orders: golden tickets, double points, from level 3. */
const VIP_CHANCE = 0.15;

/** Where the ten ingredient bins sit on the counter. */
const BIN_W = 112;
const BIN_GAP = 12;
const BIN_X0 = 24;
const BIN_Y = 414;
const BIN_H = 134;

/** Where the prep stations sit. */
const STATION_Y = 230;
const STATION_H = 148;
const CHOP_RECT = { x: 24, y: STATION_Y, w: 380, h: STATION_H };
const STOVE_RECT = { x: 420, y: STATION_Y, w: 452, h: STATION_H };
const PASS_RECT = { x: 888, y: STATION_Y, w: 368, h: STATION_H };
const BURNER_CENTERS = [
  { x: 420 + 110, y: STATION_Y + 96 },
  { x: 420 + 330, y: STATION_Y + 96 },
];

/** The plate's center on the steel strip. */
const PLATE_X = 280;
const PLATE_Y = 632;

/** One cooking game, from title screen to the end of the shift. */
export class OrderRushGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sound = new SoundBoard();
    this.state = 'title';
    this.frozen = false;
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.level = 1;
    this.dishesServed = 0;
    this.hearts = MAX_HEARTS;
    this.shiftLeft = SHIFT_SECONDS;
    this.orders = [];
    this.plate = [];
    this.pass = [];
    this.board = new ChopBoard();
    this.stove = new Stove();
    this.spawnIn = 1.5;
    this.nextOrderId = 1;
    this.popups = [];
    this.particles = [];
    this.plateShake = 0;
    this.hoverBin = -1;
    this.lastTime = 0;
    this.hot = { bins: [], serve: null, clear: null, trash: null, start: null, restart: null, chop: null, burners: [], passSlots: [] };
    this.best = 0;
    this.bindInput();
  }

  // ------------------------------------------------------------ input

  bindInput() {
    this.canvas.addEventListener('pointermove', (e) => {
      const p = this.toCanvas(e);
      this.hoverBin = this.hot.bins.findIndex((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
    });
    this.canvas.addEventListener('pointerdown', (e) => {
      this.sound.unlock();
      const p = this.toCanvas(e);
      this.click(p.x, p.y);
    });
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.sound.unlock();
      this.key(e.key);
    });
  }

  toCanvas(e) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (W / rect.width), y: (e.clientY - rect.top) * (H / rect.height) };
  }

  click(x, y) {
    if (this.state === 'title') {
      if (this.inside(x, y, this.hot.start)) this.startShift();
      return;
    }
    if (this.state === 'over') {
      if (this.inside(x, y, this.hot.restart)) this.startShift();
      return;
    }
    if (this.state !== 'playing') return;
    const bin = this.hot.bins.findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    if (bin >= 0) {
      this.addIngredient(INGREDIENTS[bin].id);
      return;
    }
    if (this.inside(x, y, this.hot.chop)) {
      this.chopAction();
      return;
    }
    const burner = this.hot.burners.findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    if (burner >= 0) {
      this.burnerAction(burner);
      return;
    }
    const slot = this.hot.passSlots.findIndex((r) => r !== null && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    if (slot >= 0) {
      this.passTake(slot);
      return;
    }
    if (this.inside(x, y, this.hot.serve)) this.servePlate();
    else if (this.inside(x, y, this.hot.clear)) this.clearPlate();
    else if (this.inside(x, y, this.hot.trash)) this.removeLast();
  }

  inside(x, y, rect) {
    return rect !== null && rect !== undefined && x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  key(k) {
    if (this.state === 'title' && (k === 'Enter' || k === ' ')) {
      this.startShift();
      return;
    }
    if (this.state === 'over' && (k === 'r' || k === 'R' || k === 'Enter')) {
      this.startShift();
      return;
    }
    if (this.state !== 'playing') return;
    if (k === 'p' || k === 'P') {
      this.state = 'paused';
      return;
    }
    if (k === ' ') {
      this.servePlate();
      return;
    }
    if (k === 'c' || k === 'C') {
      this.clearPlate();
      return;
    }
    if (k === 'Backspace') {
      this.removeLast();
      return;
    }
    if (k === 'x' || k === 'X') {
      this.chopAction();
      return;
    }
    if (k === 'f' || k === 'F') {
      this.fryTake();
      return;
    }
    if (k === 't' || k === 'T') {
      if (this.pass.length > 0) this.passTake(0);
      return;
    }
    const index = INGREDIENTS.findIndex((item) => item.key === k);
    if (index >= 0) this.addIngredient(INGREDIENTS[index].id);
  }

  // ------------------------------------------------------------ rules

  startShift() {
    this.state = 'playing';
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.level = 1;
    this.dishesServed = 0;
    this.hearts = MAX_HEARTS;
    this.shiftLeft = SHIFT_SECONDS;
    this.orders = [];
    this.plate = [];
    this.pass = [];
    this.board = new ChopBoard();
    this.stove = new Stove();
    this.spawnIn = 0.8;
    this.popups = [];
    this.particles = [];
    this.sound.order();
  }

  spawnInterval() {
    return Math.max(6, 14 - this.level * 1.5);
  }

  orderTimeMax() {
    return Math.max(22, 45 - this.level * 3);
  }

  spawnOrder() {
    if (this.orders.length >= MAX_ORDERS) return;
    const timeMax = this.orderTimeMax();
    const rush = this.level >= 2 && Math.random() < RUSH_CHANCE;
    // VIP: a golden ticket from level 3, never combined with rush.
    const vip = !rush && this.level >= 3 && Math.random() < VIP_CHANCE;
    this.orders.push({
      id: this.nextOrderId++,
      recipe: randomRecipe(),
      timeLeft: rush ? timeMax * 0.6 : timeMax,
      timeMax: rush ? timeMax * 0.6 : timeMax,
      rush,
      vip,
    });
    if (vip) this.sound.levelUp();
    else if (rush) this.sound.rush();
    else this.sound.order();
  }

  /** True when an ingredient is already on the plate, on the pass, or in a station. */
  inPlay(id) {
    return (
      this.plate.includes(id) ||
      this.pass.includes(id) ||
      this.board.item === id ||
      this.stove.burners.some((b) => b.item === id)
    );
  }

  /** Route a bin ingredient: straight to the plate, or via a station. */
  addIngredient(id) {
    if (this.inPlay(id)) {
      this.plateShake = 0.25;
      this.sound.wrong();
      return;
    }
    const prep = prepOf(id);
    if (prep === PREP.chop) {
      if (this.board.place(id)) {
        this.sound.chop();
        this.popup(214, 300, `${ingredientById(id).name} on the board!`, '#8a6a44');
      } else {
        this.plateShake = 0.25;
        this.sound.wrong();
        this.popup(214, 300, 'Board is busy — chop it first!', '#e4572e');
      }
      return;
    }
    if (prep === PREP.fry) {
      const slot = this.stove.place(id);
      if (slot >= 0) {
        this.sound.fry();
        this.popup(646, 300, `${ingredientById(id).name} on the stove!`, '#8a6a44');
      } else {
        this.plateShake = 0.25;
        this.sound.wrong();
        this.popup(646, 300, 'Stove is full!', '#e4572e');
      }
      return;
    }
    this.plate.push(id);
    this.sound.add();
    this.steam(PLATE_X, PLATE_Y - 40);
  }

  /** One chop on the board (click or X). */
  chopAction() {
    const result = this.board.chop();
    if (result === 'empty') {
      this.popup(214, 300, 'Nothing to chop — add lettuce, tomato or onion.', '#8a7a66');
      return;
    }
    if (result === 'done') {
      this.moveBoardToPass();
      return;
    }
    this.sound.chop();
    if (result === 'chopped') {
      this.sound.ready();
      this.moveBoardToPass();
    }
  }

  /** Move the board's finished item to the pass, or leave it waiting. */
  moveBoardToPass() {
    if (this.pass.length >= MAX_PASS) {
      this.popup(214, 300, 'Pass is full — plate something first!', '#e4572e');
      return;
    }
    const id = this.board.take();
    if (id === null) return;
    this.pass.push(id);
    this.sound.add();
  }

  /** Click a burner: take a ready item to the pass, toss a burned one. */
  burnerAction(index) {
    const burner = this.stove.burners[index];
    if (burner.state === 'empty') return;
    if (burner.state === 'cooking') {
      this.popup(BURNER_CENTERS[index].x, 300, 'Still cooking — wait for the ding!', '#8a7a66');
      return;
    }
    if (burner.state === 'burned') {
      burner.take();
      this.sound.burn();
      this.popup(BURNER_CENTERS[index].x, 300, 'Burned! Tossed it.', '#e4572e');
      return;
    }
    if (this.pass.length >= MAX_PASS) {
      this.popup(BURNER_CENTERS[index].x, 300, 'Pass is full — plate something first!', '#e4572e');
      return;
    }
    const id = burner.take();
    this.pass.push(id);
    this.sound.ready();
  }

  /** F key: take the first ready burner, or toss the first burned one. */
  fryTake() {
    for (let i = 0; i < this.stove.burners.length; i++) {
      if (this.stove.burners[i].state === 'ready') {
        this.burnerAction(i);
        return;
      }
    }
    for (let i = 0; i < this.stove.burners.length; i++) {
      if (this.stove.burners[i].state === 'burned') {
        this.burnerAction(i);
        return;
      }
    }
  }

  /** Move a pass item onto the plate. */
  passTake(slot) {
    if (slot >= this.pass.length) return;
    const id = this.pass[slot];
    if (this.plate.includes(id)) {
      this.plateShake = 0.25;
      this.sound.wrong();
      return;
    }
    this.pass.splice(slot, 1);
    this.plate.push(id);
    this.sound.add();
    this.steam(PLATE_X, PLATE_Y - 40);
  }

  removeLast() {
    if (this.plate.length === 0) return;
    this.plate.pop();
    this.sound.tone(300, 0.07, 'triangle', 200);
  }

  clearPlate() {
    if (this.plate.length === 0) return;
    this.plate = [];
    this.sound.tone(300, 0.07, 'triangle', 200);
  }

  servePlate() {
    if (this.plate.length === 0) return;
    const dish = recipeFor(this.plate);
    if (!dish) {
      this.combo = 0;
      this.plateShake = 0.4;
      this.sound.wrong();
      this.popup(PLATE_X, PLATE_Y - 120, 'No order wants this!', '#e4572e');
      return;
    }
    const order = this.orders.find((o) => o.recipe.id === dish.id);
    if (!order) {
      this.combo = 0;
      this.plateShake = 0.4;
      this.sound.wrong();
      this.popup(PLATE_X, PLATE_Y - 120, `Nobody ordered a ${dish.name}`, '#e4572e');
      return;
    }
    const timeBonus = Math.round(50 * (order.timeLeft / order.timeMax));
    const multiplier = 1 + 0.25 * this.combo;
    const rushBonus = order.rush ? 1.5 : 1;
    const vipBonus = order.vip ? 2 : 1;
    const points = Math.round((dish.base + timeBonus) * multiplier * rushBonus * vipBonus);
    this.score += points;
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.dishesServed += 1;
    this.orders = this.orders.filter((o) => o.id !== order.id);
    this.plate = [];
    this.sound.serve();
    // Score popups sit in the clear gap between the plate and the
    // SERVE button — never on top of the dish itself.
    this.popup(495, 590, `+${points}!`, '#2e7d32');
    if (order.vip) this.popup(495, 646, '★ VIP 2×!', '#8a6410');
    if (order.rush) this.popup(495, 646, 'RUSH x1.5', '#e4572e');
    if (this.combo >= 3) this.popup(495, 618, `COMBO x${this.combo}`, '#f2a007');
    const nextLevel = 1 + Math.floor(this.dishesServed / 4);
    if (nextLevel > this.level) {
      this.level = nextLevel;
      this.sound.levelUp();
      this.popup(W / 2, 300, `LEVEL ${this.level} — orders come faster!`, '#e4572e');
    }
  }

  expireOrder(order) {
    this.orders = this.orders.filter((o) => o.id !== order.id);
    this.hearts -= 1;
    this.combo = 0;
    this.sound.expire();
    this.popup(W / 2, 300, `Order lost: ${order.recipe.name}`, '#e4572e');
    if (this.hearts <= 0) this.endShift(false);
  }

  endShift(finished) {
    this.state = 'over';
    this.best = Math.max(this.best, this.score);
    this.sound.shiftEnd();
    this.shiftFinished = finished;
  }

  popup(x, y, text, color) {
    this.popups.push({ x, y, text, color, life: 1.6 });
  }

  steam(x, y) {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 90,
        y,
        vx: (Math.random() - 0.5) * 12,
        vy: -28 - Math.random() * 22,
        life: 0.7 + Math.random() * 0.4,
        size: 4 + Math.random() * 6,
      });
    }
  }

  // ------------------------------------------------------------ update

  update(dt) {
    if (this.state !== 'playing' || this.frozen) return;
    this.shiftLeft -= dt;
    if (this.shiftLeft <= 0) {
      this.shiftLeft = 0;
      this.endShift(true);
      return;
    }
    this.spawnIn -= dt;
    if (this.spawnIn <= 0) {
      this.spawnOrder();
      this.spawnIn = this.spawnInterval();
    }
    for (const order of [...this.orders]) {
      order.timeLeft -= dt;
      if (order.timeLeft <= 0) this.expireOrder(order);
    }
    this.board.update(dt);
    const before = this.stove.burners.map((b) => b.state);
    this.stove.update(dt);
    this.stove.burners.forEach((burner, i) => {
      if (before[i] === 'cooking' && burner.state === 'ready') {
        this.sound.ready();
        this.popup(BURNER_CENTERS[i].x, 300, `${ingredientById(burner.item).name} is ready!`, '#4e9b47');
      }
      if (before[i] !== 'burned' && burner.state === 'burned') {
        this.sound.burn();
        this.popup(BURNER_CENTERS[i].x, 300, `${ingredientById(burner.item).name} burned!`, '#e4572e');
      }
    });
    this.plateShake = Math.max(0, this.plateShake - dt);
    this.popups.forEach((p) => {
      p.life -= dt;
      p.y -= 26 * dt;
    });
    this.popups = this.popups.filter((p) => p.life > 0);
    this.particles.forEach((p) => {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    });
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  // ------------------------------------------------------------ render

  frame(now) {
    const dt = Math.min(0.05, (now - this.lastTime) / 1000 || 0);
    this.lastTime = now;
    this.update(dt);
    this.render(now);
    requestAnimationFrame((t) => this.frame(t));
  }

  render(now) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, W, H);
    drawKitchen(ctx, W, H);
    this.renderHeader(ctx);
    this.renderOrders(ctx, now);
    this.renderStations(ctx, now);
    this.renderBins(ctx);
    this.renderPlating(ctx, now);
    this.renderFooter(ctx);
    this.renderParticles(ctx);
    this.renderPopups(ctx);
    if (this.state === 'title') this.renderTitle(ctx);
    if (this.state === 'paused') this.renderPaused(ctx);
    if (this.state === 'over') this.renderOver(ctx);
  }

  renderHeader(ctx) {
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(0, 0, W, 58);
    drawFlame(ctx, 44, 30, 1.1);
    ctx.fillStyle = '#f6e7ce';
    ctx.font = 'bold 26px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SIZZLE & SERVE', 66, 38);
    ctx.font = '14px "Trebuchet MS", sans-serif';
    ctx.fillStyle = '#f2a007';
    ctx.fillText('ORDER RUSH', 66, 52);
    const shiftRatio = this.shiftLeft / SHIFT_SECONDS;
    ctx.fillStyle = '#5a4632';
    roundRect(ctx, 470, 16, 340, 26, 13);
    ctx.fill();
    ctx.fillStyle = shiftRatio > 0.3 ? '#5da24a' : '#e4572e';
    if (shiftRatio > 0) {
      roundRect(ctx, 470, 16, 340 * shiftRatio, 26, 13);
      ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    const mins = Math.floor(this.shiftLeft / 60);
    const secs = Math.floor(this.shiftLeft % 60);
    ctx.fillText(`SHIFT ${mins}:${String(secs).padStart(2, '0')}`, 640, 34);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#f6e7ce';
    ctx.font = 'bold 24px "Trebuchet MS", sans-serif';
    ctx.fillText(`${this.score} pts`, 1256, 32);
    ctx.font = '15px "Trebuchet MS", sans-serif';
    ctx.fillStyle = '#f2a007';
    ctx.fillText(`LEVEL ${this.level}   COMBO x${this.combo}`, 1256, 51);
    ctx.textAlign = 'left';
    for (let i = 0; i < MAX_HEARTS; i++) {
      ctx.fillStyle = i < this.hearts ? '#e4572e' : '#5a4632';
      ctx.beginPath();
      const hx = 860 + i * 30;
      ctx.arc(hx, 29, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = i < this.hearts ? '#fff' : '#8a7a66';
      ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('♥', hx, 33);
    }
  }

  renderOrders(ctx, now) {
    ctx.fillStyle = '#3a2a1a';
    ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ORDER BOARD', 24, 78);
    ctx.font = '13px "Trebuchet MS", sans-serif';
    ctx.fillStyle = '#7a6a55';
    ctx.fillText('serve the dish before its timer runs out', 170, 78);
    for (let i = 0; i < MAX_ORDERS; i++) {
      const x = 24 + i * 408;
      if (i < this.orders.length) {
        drawTicket(ctx, this.orders[i], x, 88, 392, 104, this.plate, now);
      } else {
        ctx.fillStyle = 'rgba(255,253,246,0.45)';
        roundRect(ctx, x, 88, 392, 104, 12);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 2;
        roundRect(ctx, x, 88, 392, 104, 12);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#8a7a66';
        ctx.font = 'italic 16px "Trebuchet MS", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('waiting for the next order…', x + 196, 142);
      }
    }
  }

  renderStations(ctx, now) {
    ctx.fillStyle = '#3a2a1a';
    ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('PREP STATIONS', 24, 220);
    ctx.font = '13px "Trebuchet MS", sans-serif';
    ctx.fillStyle = '#7a6a55';
    ctx.fillText('chop it, fry it, then plate it — while the next ticket waits', 170, 220);
    drawChopBoard(ctx, this.board, CHOP_RECT.x, CHOP_RECT.y, CHOP_RECT.w, CHOP_RECT.h, now);
    drawStove(ctx, this.stove, STOVE_RECT.x, STOVE_RECT.y, STOVE_RECT.w, STOVE_RECT.h, now);
    drawPass(ctx, this.pass, PASS_RECT.x, PASS_RECT.y, PASS_RECT.w, PASS_RECT.h);
    this.hot.chop = { ...CHOP_RECT };
    this.hot.burners = BURNER_CENTERS.map((c) => ({ x: c.x - 52, y: c.y - 52, w: 104, h: 104 }));
    this.hot.passSlots = [0, 1, 2].map((i) => ({
      x: PASS_RECT.x + 12 + i * 112,
      y: PASS_RECT.y + 44,
      w: 96,
      h: 96,
    }));
  }

  renderBins(ctx) {
    ctx.fillStyle = '#fff8ea';
    ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('INGREDIENTS — click a bin or press its key', 24, 408);
    this.hot.bins = [];
    INGREDIENTS.forEach((item, i) => {
      const x = BIN_X0 + i * (BIN_W + BIN_GAP);
      const y = BIN_Y;
      const hovered = this.hoverBin === i;
      const onPlate = this.plate.includes(item.id);
      const prepping = !onPlate && this.inPlay(item.id);
      ctx.save();
      if (hovered) {
        ctx.shadowColor = '#f2a007';
        ctx.shadowBlur = 16;
      }
      ctx.fillStyle = onPlate ? '#d9eccf' : prepping ? '#fbeecb' : '#fffdf6';
      roundRect(ctx, x, y, BIN_W, BIN_H, 12);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = onPlate ? '#4e9b47' : prepping ? '#f2a007' : '#d8c9a8';
      ctx.lineWidth = onPlate || prepping ? 3 : 2;
      roundRect(ctx, x, y, BIN_W, BIN_H, 12);
      ctx.stroke();
      drawIngredientIcon(ctx, item.id, x + BIN_W / 2, y + 52, 44);
      ctx.fillStyle = '#3a2a1a';
      ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.name, x + BIN_W / 2, y + 102);
      // One bottom line: the key, plus the item's state when relevant.
      ctx.font = '12px "Trebuchet MS", sans-serif';
      if (onPlate) {
        ctx.fillStyle = '#4e9b47';
        ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
        ctx.fillText(`✓ plate • key ${item.key}`, x + BIN_W / 2, y + 124);
      } else if (prepping) {
        ctx.fillStyle = '#b07818';
        ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
        ctx.fillText(`in prep • key ${item.key}`, x + BIN_W / 2, y + 124);
      } else {
        ctx.fillStyle = '#8a7a66';
        ctx.fillText(`key ${item.key}`, x + BIN_W / 2, y + 124);
      }
      ctx.restore();
      this.hot.bins.push({ x, y, w: BIN_W, h: BIN_H });
    });
  }

  renderPlating(ctx, now) {
    const shakeX = this.plateShake > 0 ? Math.sin(this.plateShake * 60) * 6 * this.plateShake : 0;
    const dish = recipeFor(this.plate);
    ctx.save();
    ctx.translate(shakeX, 0);
    // Hero plate: 320 wide, layered, steaming, gold Ready glow.
    drawDishStack(ctx, this.plate, PLATE_X, PLATE_Y, 320, dish !== undefined, now);
    ctx.restore();
    ctx.fillStyle = '#5a4632';
    ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('YOUR PLATE', 24, 600);
    const hintX = 800;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#3a2a1a';
    ctx.font = 'bold 18px "Trebuchet MS", sans-serif';
    if (dish) {
      ctx.fillText(`Ready: ${dish.name} — serve it!`, hintX, 600);
    } else if (this.plate.length > 0) {
      const candidates = RECIPES.filter((r) => matchingCount(this.plate, r) === this.plate.length);
      if (candidates.length > 0) {
        const next = candidates[0];
        const missing = missingIngredients(this.plate, next);
        ctx.fillText(`Building: ${next.name}`, hintX, 600);
        ctx.font = '15px "Trebuchet MS", sans-serif';
        ctx.fillStyle = '#7a6a55';
        ctx.fillText(`still needs: ${missing.map((id) => ingredientById(id).name).join(', ')}`, hintX, 624);
      } else {
        ctx.fillText('This mix matches no recipe — clear it!', hintX, 600);
      }
    } else {
      ctx.fillText('Pick ingredients to build a dish.', hintX, 600);
      ctx.font = '15px "Trebuchet MS", sans-serif';
      ctx.fillStyle = '#7a6a55';
      ctx.fillText('Bins need prep? Chop it, fry it, then plate it.', hintX, 624);
    }
    this.renderButton(ctx, 540, 584, 200, 48, '#4e9b47', 'SERVE  (Space)', 'serve');
    this.renderButton(ctx, 540, 640, 96, 32, '#8a7a66', 'CLEAR (C)', 'clear');
    this.renderButton(ctx, 644, 640, 96, 32, '#8a7a66', 'UNDO (Bksp)', 'trash');
  }

  renderButton(ctx, x, y, w, h, color, label, slot) {
    ctx.fillStyle = color;
    roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${w > 150 ? 18 : 13}px "Trebuchet MS", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h / 2 + 5);
    this.hot[slot] = { x, y, w, h };
  }

  renderFooter(ctx) {
    ctx.fillStyle = '#f6e7ce';
    ctx.font = '15px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Click ingredients or press 1–9, 0  •  X chops  •  F takes from the stove  •  T plates from the pass  •  Space serves', 24, 692);
    ctx.textAlign = 'right';
    const toNext = 4 - (this.dishesServed % 4);
    ctx.fillText(`Served: ${this.dishesServed}   •   ${toNext} more dish${toNext === 1 ? '' : 'es'} to Level ${this.level + 1}`, 1256, 692);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8a7a66';
    ctx.font = '13px "Trebuchet MS", sans-serif';
    ctx.fillText('Sizzle & Serve — an original kitchen rush. No orders were harmed.', 640, 712);
  }

  renderParticles(ctx) {
    for (const p of this.particles) {
      ctx.fillStyle = `rgba(255,255,255,${Math.max(0, p.life)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderPopups(ctx) {
    ctx.textAlign = 'center';
    for (const p of this.popups) {
      ctx.globalAlpha = Math.min(1, p.life);
      ctx.fillStyle = p.color;
      ctx.font = 'bold 24px "Trebuchet MS", sans-serif';
      ctx.fillText(p.text, p.x, p.y);
      ctx.globalAlpha = 1;
    }
  }

  renderTitle(ctx) {
    ctx.fillStyle = 'rgba(43,29,18,0.94)';
    ctx.fillRect(0, 0, W, H);
    drawFlame(ctx, 640, 150, 3.2);
    ctx.fillStyle = '#f6e7ce';
    ctx.font = 'bold 64px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SIZZLE & SERVE', 640, 250);
    ctx.fillStyle = '#f2a007';
    ctx.font = 'bold 26px "Trebuchet MS", sans-serif';
    ctx.fillText('— ORDER RUSH —', 640, 292);
    ctx.fillStyle = '#fff';
    ctx.font = '19px "Trebuchet MS", sans-serif';
    ctx.fillText('Tickets land on the board. Chop it, fry it, plate it — fast.', 640, 350);
    ctx.fillText('Serve before the timer runs out — and don\'t drop a heart.', 640, 380);
    ctx.font = '16px "Trebuchet MS", sans-serif';
    ctx.fillStyle = '#f6e7ce';
    ctx.fillText('Click ingredients or press 1–9, 0  •  X chops  •  F takes from the stove  •  Space serves', 640, 420);
    this.renderButton(ctx, 540, 460, 200, 56, '#e4572e', 'START SHIFT', 'start');
    ctx.fillStyle = '#f2a007';
    ctx.font = '15px "Trebuchet MS", sans-serif';
    ctx.fillText(this.best > 0 ? `Best score so far: ${this.best} pts` : 'First shift — good luck, chef!', 640, 556);
  }

  renderPaused(ctx) {
    ctx.fillStyle = 'rgba(43,29,18,0.88)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f6e7ce';
    ctx.font = 'bold 48px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', 640, 350);
    ctx.font = '19px "Trebuchet MS", sans-serif';
    ctx.fillText('Press P to get back to the pass.', 640, 392);
  }

  renderOver(ctx) {
    ctx.fillStyle = 'rgba(43,29,18,0.94)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f6e7ce';
    ctx.font = 'bold 52px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.shiftFinished ? 'SHIFT COMPLETE!' : 'OUT OF HEARTS!', 640, 250);
    ctx.fillStyle = '#f2a007';
    ctx.font = 'bold 30px "Trebuchet MS", sans-serif';
    ctx.fillText(`${this.score} points`, 640, 310);
    ctx.fillStyle = '#fff';
    ctx.font = '19px "Trebuchet MS", sans-serif';
    ctx.fillText(`Dishes served: ${this.dishesServed}    Best combo: x${this.bestCombo}    Level reached: ${this.level}`, 640, 360);
    this.renderButton(ctx, 540, 420, 200, 56, '#e4572e', 'PLAY AGAIN (R)', 'restart');
  }

  // ------------------------------------------------------------ demos

  /** A frozen, staged scene for screenshots: the game's own render. */
  applyShot(name) {
    this.frozen = true;
    if (name === 'title') {
      this.state = 'title';
      return;
    }
    this.state = 'playing';
    if (name === 'cover') {
      this.score = 860;
      this.combo = 5;
      this.level = 2;
      this.dishesServed = 9;
      this.hearts = 3;
      this.shiftLeft = 72;
      this.plate = ['bun', 'patty', 'lettuce'];
      this.orders = [
        { id: 1, recipe: RECIPES[0], timeLeft: 30, timeMax: 42, rush: false },
        { id: 2, recipe: RECIPES[6], timeLeft: 9, timeMax: 25, rush: true },
        { id: 3, recipe: RECIPES[5], timeLeft: 22, timeMax: 40, rush: false },
      ];
      this.board.item = 'tomato';
      this.board.chops = 2;
      this.board.done = false;
      this.stove.burners[0].item = 'patty';
      this.stove.burners[0].seconds = 2.6;
      this.stove.burners[1].item = 'patty';
      this.stove.burners[1].seconds = 5.5;
      this.pass = ['cheese', 'tortilla'];
    } else if (name === 'serve') {
      this.score = 1240;
      this.combo = 6;
      this.level = 2;
      this.dishesServed = 10;
      this.hearts = 3;
      this.shiftLeft = 64;
      this.plate = ['bun', 'patty', 'cheese', 'tomato'];
      this.orders = [
        { id: 1, recipe: RECIPES[1], timeLeft: 28, timeMax: 42, rush: false },
        { id: 2, recipe: RECIPES[4], timeLeft: 18, timeMax: 38, rush: false },
      ];
      this.popup(475, 582, '+210!', '#2e7d32');
      this.popup(475, 608, 'COMBO x6', '#f2a007');
    } else if (name === 'rush') {
      this.score = 1480;
      this.combo = 7;
      this.level = 3;
      this.dishesServed = 13;
      this.hearts = 2;
      this.shiftLeft = 38;
      this.plate = ['tortilla', 'patty'];
      this.orders = [
        { id: 1, recipe: RECIPES[0], timeLeft: 3, timeMax: 42, rush: false, vip: false },
        { id: 2, recipe: RECIPES[3], timeLeft: 12, timeMax: 22, rush: true, vip: false },
        { id: 3, recipe: RECIPES[2], timeLeft: 26, timeMax: 36, rush: false, vip: false },
      ];
      this.board.item = 'onion';
      this.board.chops = 1;
      this.board.done = false;
      this.stove.burners[0].item = 'patty';
      this.stove.burners[0].seconds = 10.2;
      this.pass = ['lettuce'];
    } else if (name === 'vip') {
      // The v3 hero shot: a golden VIP ticket, a worried face on the
      // expiring ticket, a happy face on the fresh one, and a complete
      // steaming dish on the hero plate.
      this.score = 1750;
      this.combo = 8;
      this.level = 3;
      this.dishesServed = 14;
      this.hearts = 3;
      this.shiftLeft = 52;
      this.plate = ['bun', 'patty', 'cheese', 'tomato'];
      this.orders = [
        { id: 4, recipe: RECIPES[1], timeLeft: 26, timeMax: 38, rush: false, vip: true },
        { id: 5, recipe: RECIPES[0], timeLeft: 7, timeMax: 42, rush: false, vip: false },
        { id: 6, recipe: RECIPES[2], timeLeft: 30, timeMax: 36, rush: false, vip: false },
      ];
      this.board.item = 'lettuce';
      this.board.chops = 2;
      this.board.done = false;
      this.stove.burners[0].item = 'egg';
      this.stove.burners[0].seconds = 2.2;
      this.pass = ['onion'];
      this.popup(495, 590, '+264!', '#2e7d32');
      this.popup(495, 618, 'COMBO x8', '#f2a007');
      this.popup(495, 646, '★ VIP 2×!', '#8a6410');
    }
  }

  /** A tiny in-page self test, run with ?selftest=1. */
  selfTest() {
    const results = [];
    const check = (name, ok) => results.push({ name, ok: !!ok });
    check('recipeFor finds Burger', recipeFor(['tomato', 'bun', 'lettuce', 'patty'])?.id === 'burger');
    check('recipeFor rejects a wrong mix', recipeFor(['bun', 'patty', 'sauce']) === undefined);
    check('patty needs frying', prepOf('patty') === PREP.fry);
    check('lettuce needs chopping', prepOf('lettuce') === PREP.chop);
    check('bun needs no prep', prepOf('bun') === PREP.none);
    const board = new ChopBoard();
    board.place('tomato');
    board.chop();
    board.chop();
    check('board: three chops finish an item', board.chop() === 'chopped' && board.done === true);
    check('board: taking a finished item empties it', board.take() === 'tomato' && board.free === true);
    const stove = new Stove();
    stove.place('patty');
    stove.update(FRY_READY_SECONDS);
    check('stove: patty is ready at 4s', stove.burners[0].state === 'ready');
    stove.update(FRY_READY_SECONDS);
    check('stove: patty is still ready at 8s', stove.burners[0].state === 'ready');
    stove.update(1.5);
    check('stove: patty burns after 9s', stove.burners[0].state === 'burned');
    const g = new OrderRushGame(this.canvas);
    g.state = 'playing';
    g.orders = [{ id: 1, recipe: RECIPES[0], timeLeft: 40, timeMax: 45, rush: false }];
    g.plate = ['bun', 'patty', 'lettuce', 'tomato'];
    const before = g.score;
    g.servePlate();
    check('serving the right dish scores', g.score > before && g.dishesServed === 1 && g.orders.length === 0);
    const g2 = new OrderRushGame(this.canvas);
    g2.state = 'playing';
    g2.orders = [{ id: 1, recipe: RECIPES[0], timeLeft: 40, timeMax: 45, rush: true, vip: false }];
    g2.plate = ['bun', 'patty', 'lettuce', 'tomato'];
    g2.servePlate();
    check('rush order pays 1.5x a normal one', g2.score > (g.score - before) * 1.4);
    const gVip = new OrderRushGame(this.canvas);
    gVip.state = 'playing';
    gVip.orders = [{ id: 1, recipe: RECIPES[0], timeLeft: 40, timeMax: 45, rush: false, vip: true }];
    gVip.plate = ['bun', 'patty', 'lettuce', 'tomato'];
    gVip.servePlate();
    check('VIP order pays 2x a normal one', gVip.score === (g.score - before) * 2);
    check('VIP order is double the rush order', gVip.score > g2.score);
    check('hero plate renders a complete dish without throwing', (() => {
      try {
        gVip.plate = ['bun', 'patty', 'cheese', 'tomato'];
        gVip.render(1000);
        return true;
      } catch {
        return false;
      }
    })());
    check('VIP ticket renders without throwing', (() => {
      try {
        gVip.orders = [{ id: 7, recipe: RECIPES[1], timeLeft: 26, timeMax: 38, rush: false, vip: true }];
        gVip.render(1000);
        return true;
      } catch {
        return false;
      }
    })());
    const g3 = new OrderRushGame(this.canvas);
    g3.state = 'playing';
    g3.addIngredient('bun');
    g3.addIngredient('bun');
    check('duplicate ingredient is refused', g3.plate.length === 1);
    const g4 = new OrderRushGame(this.canvas);
    g4.startShift();
    check('startShift enters the playing state', g4.state === 'playing');
    check('first order is armed, not instant', g4.orders.length === 0 && g4.spawnIn === 0.8);
    g4.update(1);
    check('first order lands within a second', g4.orders.length === 1);
    check('one second of update ticks the shift clock', g4.shiftLeft === 149);
    check('order timer counts down', g4.orders[0].timeLeft < g4.orders[0].timeMax);
    const passed = results.filter((r) => r.ok).length;
    const line = `SELFTEST ${passed}/${results.length} ${passed === results.length ? 'PASS' : 'FAIL'}`;
    document.title = line;
    let node = document.getElementById('selftest');
    if (!node) {
      node = document.createElement('div');
      node.id = 'selftest';
      document.body.appendChild(node);
    }
    node.textContent = [line, ...results.map((r) => `${r.ok ? 'ok' : 'FAIL'} ${r.name}`)].join('\n');
    console.log(line);
    for (const r of results) console.log(r.ok ? 'ok' : 'FAIL', r.name);
  }
}
