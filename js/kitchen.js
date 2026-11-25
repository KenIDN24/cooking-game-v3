/* Sizzle & Serve v3 — everything the game draws: the kitchen, the
   ingredient icons, the dish on the plate, the order tickets, and
   the prep stations. All art is drawn in code; no image files.
   v3 adds customer faces with moods on the tickets, a golden VIP
   ticket, and a hero plate that steams and glows gold when ready. */

import { ingredientById } from './recipes.js';
import { FRY_READY_SECONDS, FRY_BURN_SECONDS, CHOPS_TO_FINISH } from './stations.js';

/** A rounded rectangle path, filled by the caller. */
export function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** A little flame, for the logo and the stove burners. */
export function drawFlame(ctx, x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#e4572e';
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.bezierCurveTo(8, -6, 10, 2, 6, 8);
  ctx.bezierCurveTo(4, 12, -4, 12, -6, 8);
  ctx.bezierCurveTo(-10, 2, -8, -6, 0, -14);
  ctx.fill();
  ctx.fillStyle = '#f2a007';
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.bezierCurveTo(5, -1, 6, 4, 3, 7);
  ctx.bezierCurveTo(1, 9, -2, 9, -3, 7);
  ctx.bezierCurveTo(-6, 4, -5, -1, 0, -6);
  ctx.fill();
  ctx.restore();
}

/** The kitchen itself: tiled wall, hanging rail, wood counter,
   steel pass. The stations and bins sit on top of this. */
export function drawKitchen(ctx, W, H) {
  // Wall behind the order board: teal tiles.
  ctx.fillStyle = '#7fb8a8';
  ctx.fillRect(0, 58, W, 142);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 58);
    ctx.lineTo(x, 200);
    ctx.stroke();
  }
  for (let y = 58; y <= 200; y += 47) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  // Wall behind the stations: warm cream.
  ctx.fillStyle = '#f3e2c2';
  ctx.fillRect(0, 200, W, 198);
  ctx.fillStyle = '#8a6a44';
  ctx.fillRect(0, 200, W, 6);
  // Wood counter behind the bins.
  ctx.fillStyle = '#a8763e';
  ctx.fillRect(0, 398, W, 162);
  ctx.strokeStyle = 'rgba(90,55,20,0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const y = 420 + i * 28;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(300, y + 6, 700, y - 6, W, y + 3);
    ctx.stroke();
  }
  ctx.fillStyle = '#7a4e22';
  ctx.fillRect(0, 552, W, 8);
  // Steel pass strip behind the plate.
  ctx.fillStyle = '#dfe6ea';
  ctx.fillRect(0, 560, W, 104);
  ctx.fillStyle = '#b9c4ca';
  for (let x = 24; x < W; x += 96) {
    ctx.beginPath();
    ctx.arc(x, 566, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Heat lamp glow over the plate area.
  const glow = ctx.createRadialGradient(280, 560, 10, 280, 560, 130);
  glow.addColorStop(0, 'rgba(242,160,7,0.28)');
  glow.addColorStop(1, 'rgba(242,160,7,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(150, 560, 260, 104);
  // Footer strip.
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(0, 664, W, 56);
}

/** One ingredient's icon, drawn at (cx, cy) with the given size. */
export function drawIngredientIcon(ctx, id, cx, cy, size) {
  const r = size / 2;
  ctx.save();
  ctx.translate(cx, cy);
  if (id === 'bun') {
    ctx.fillStyle = '#e8a54b';
    ctx.beginPath();
    ctx.arc(0, 2, r * 0.85, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c47f2a';
    ctx.fillRect(-r * 0.85, 2, r * 1.7, r * 0.35);
    ctx.fillStyle = '#fff3d6';
    [[-0.4, -0.45], [0, -0.6], [0.4, -0.45], [-0.2, -0.2], [0.25, -0.2]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.arc(dx * r, dy * r, r * 0.09, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (id === 'patty') {
    ctx.fillStyle = '#7a4a26';
    roundRect(ctx, -r, -r * 0.45, r * 2, r * 0.9, r * 0.4);
    ctx.fill();
    ctx.strokeStyle = '#54301a';
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, i * r * 0.3);
      ctx.lineTo(r * 0.6, i * r * 0.3);
      ctx.stroke();
    }
  } else if (id === 'lettuce') {
    ctx.fillStyle = '#5da24a';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.ellipse(i * r * 0.5, 0, r * 0.55, r * 0.7, i * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#3e7a30';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.6);
    ctx.lineTo(0, r * 0.6);
    ctx.stroke();
  } else if (id === 'tomato') {
    ctx.fillStyle = '#e4572e';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5da24a';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.9);
    ctx.lineTo(-r * 0.35, -r * 0.45);
    ctx.lineTo(r * 0.35, -r * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.35, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'cheese') {
    ctx.fillStyle = '#f6c453';
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, r * 0.7);
    ctx.lineTo(0, -r * 0.85);
    ctx.lineTo(r * 0.9, r * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d99a1f';
    [[-0.3, 0.25], [0.25, 0.35], [0.05, -0.15]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.arc(dx * r, dy * r, r * 0.11, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (id === 'pasta') {
    ctx.strokeStyle = '#f2d492';
    ctx.lineWidth = r * 0.22;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc(0, 0, r * (0.75 - k * 0.22), 0.4, Math.PI * 1.8);
      ctx.stroke();
    }
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = r * 0.14;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
    ctx.stroke();
  } else if (id === 'sauce') {
    ctx.fillStyle = '#c0392e';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.9);
    ctx.bezierCurveTo(r * 0.8, -r * 0.1, r * 0.85, r * 0.5, 0, r * 0.9);
    ctx.bezierCurveTo(-r * 0.85, r * 0.5, -r * 0.8, -r * 0.1, 0, -r * 0.9);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.2, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'tortilla') {
    ctx.fillStyle = '#f0d9a8';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c9a869';
    [[-0.4, -0.3], [0.35, -0.4], [0.1, 0.15], [-0.15, 0.45], [0.45, 0.3]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.arc(dx * r, dy * r, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (id === 'egg') {
    ctx.fillStyle = '#fffdf6';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.95, r * 0.8, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2a007';
    ctx.beginPath();
    ctx.arc(r * 0.1, 0, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e0a800';
    ctx.beginPath();
    ctx.arc(r * 0.1, 0, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'onion') {
    ctx.strokeStyle = '#e8d5f2';
    ctx.lineWidth = r * 0.18;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc(0, 0, r * (0.85 - k * 0.24), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = '#a678c2';
    ctx.lineWidth = r * 0.08;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** Steam wisps rising off a finished dish, animated by `now`. */
export function drawSteamWisps(ctx, cx, topY, now) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const sx = cx - 40 + i * 40;
    const phase = now / 600 + i * 2.1;
    ctx.lineWidth = 5 - i * 0.8;
    ctx.globalAlpha = 0.55 - i * 0.12;
    ctx.beginPath();
    for (let t = 0; t <= 1; t += 0.1) {
      const y = topY - t * 52;
      const x = sx + Math.sin(phase + t * 5) * 7 * t;
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** The dish being built, stacked layer by layer on the plate.
    When `ready` is true the dish is complete: a warm gold glow
    pools behind the plate, a pulsing gold ring circles the rim,
    and steam rises off the top layer. */
export function drawDishStack(ctx, plateIds, cx, cy, width, ready, now) {
  // Warm gold glow behind a finished dish.
  if (ready) {
    const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, width * 0.75);
    glow.addColorStop(0, 'rgba(242,160,7,0.4)');
    glow.addColorStop(1, 'rgba(242,160,7,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - width * 0.75, cy - width * 0.6, width * 1.5, width * 1.1);
  }
  // The plate.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(cx, cy, width / 2, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c9d4d8';
  ctx.beginPath();
  ctx.ellipse(cx, cy, width / 2 - 14, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  // Pulsing gold ring around the rim of a finished dish.
  if (ready) {
    const pulse = 0.55 + 0.35 * Math.sin(now / 220);
    ctx.strokeStyle = `rgba(242,160,7,${pulse})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(cx, cy, width / 2 + 4, 21, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Layers, bottom to top.
  let y = cy - 8;
  const layerH = 13;
  for (const id of plateIds) {
    y -= layerH;
    const w = width * 0.72;
    const x = cx - w / 2;
    if (id === 'bun') {
      ctx.fillStyle = '#e8a54b';
      ctx.beginPath();
      ctx.ellipse(cx, y + 4, w / 2, 22, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff3d6';
      [[-0.25, -0.3], [0.1, -0.45], [0.35, -0.25]].forEach(([dx, dy]) => {
        ctx.beginPath();
        ctx.arc(cx + dx * w, y + 4 + dy * 40, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
      y -= 14;
    } else if (id === 'tortilla') {
      ctx.fillStyle = '#f0d9a8';
      roundRect(ctx, x, y - 4, w, 10, 5);
      ctx.fill();
    } else if (id === 'patty' || id === 'egg') {
      ctx.fillStyle = id === 'patty' ? '#7a4a26' : '#fffdf6';
      roundRect(ctx, x + 6, y - 6, w - 12, 12, 6);
      ctx.fill();
      if (id === 'egg') {
        ctx.fillStyle = '#f2a007';
        ctx.beginPath();
        ctx.arc(cx, y, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (id === 'lettuce') {
      ctx.fillStyle = '#5da24a';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(cx - w / 3 + i * (w / 3), y, w / 6, 7, (i - 1) * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (id === 'tomato') {
      ctx.fillStyle = '#e4572e';
      roundRect(ctx, x + 10, y - 5, w - 20, 10, 5);
      ctx.fill();
    } else if (id === 'cheese') {
      ctx.fillStyle = '#f6c453';
      ctx.beginPath();
      ctx.moveTo(x, y - 4);
      ctx.lineTo(x + w, y - 4);
      ctx.lineTo(x + w - 8, y + 8);
      ctx.lineTo(x + w / 2, y + 2);
      ctx.lineTo(x + 8, y + 8);
      ctx.closePath();
      ctx.fill();
    } else if (id === 'pasta') {
      ctx.strokeStyle = '#f2d492';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cx, y, w / 3, 0.15, Math.PI * 0.85);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, y, w / 4, 0.3, Math.PI * 0.7);
      ctx.stroke();
    } else if (id === 'sauce') {
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.moveTo(x + 8, y - 2);
      ctx.quadraticCurveTo(cx, y + 10, x + w - 8, y - 2);
      ctx.lineTo(x + w - 8, y - 6);
      ctx.quadraticCurveTo(cx, y + 2, x + 8, y - 6);
      ctx.closePath();
      ctx.fill();
    } else if (id === 'onion') {
      ctx.strokeStyle = '#e8d5f2';
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(cx - w / 4 + i * (w / 4), y, 9, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
  // Steam off the top layer of a finished dish.
  if (ready && plateIds.length > 0) {
    drawSteamWisps(ctx, cx, y - 6, now);
  }
}

/** One customer's face, drawn on an order ticket. The variant is
    picked from the order id so the same customer always looks the
    same; the mood follows the ticket's remaining time: happy while
    there is plenty of time, neutral in the middle, worried when
    the timer is nearly gone. */
export function drawCustomerFace(ctx, order, cx, cy, r) {
  const variants = [
    { skin: '#f2c89b', hair: '#3a2a1a', style: 'short' },
    { skin: '#e8b07e', hair: '#1c1c22', style: 'bun' },
    { skin: '#c98d5f', hair: '#5a4632', style: 'afro' },
    { skin: '#f7d7b0', hair: '#e4572e', style: 'cap' },
    { skin: '#8a5a33', hair: '#141414', style: 'long' },
    { skin: '#f2c89b', hair: '#8a8a96', style: 'short' },
  ];
  const v = variants[(order.id || 1) % variants.length];
  const ratio = order.timeMax > 0 ? order.timeLeft / order.timeMax : 1;
  const mood = ratio > 0.5 ? 'happy' : ratio > 0.25 ? 'neutral' : 'worried';
  // Head.
  ctx.fillStyle = v.skin;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(58,42,26,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  // Hair.
  ctx.fillStyle = v.hair;
  if (v.style === 'short') {
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.35, r * 0.95, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
  } else if (v.style === 'bun') {
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.45, r * 0.9, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy - r * 1.05, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  } else if (v.style === 'afro') {
    ctx.beginPath();
    ctx.arc(cx - r * 0.55, cy - r * 0.5, r * 0.5, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.55, cy - r * 0.5, r * 0.5, 0, Math.PI * 2);
    ctx.arc(cx, cy - r * 0.75, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  } else if (v.style === 'cap') {
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.4, r * 0.95, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(cx - r, cy - r * 0.5, r * 2, r * 0.28);
    ctx.beginPath();
    ctx.ellipse(cx, cy - r * 0.35, r * 1.15, r * 0.25, 0, 0, Math.PI);
    ctx.fill();
  } else if (v.style === 'long') {
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.3, r * 0.98, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(cx - r, cy - r * 0.3, r * 0.32, r * 0.9);
    ctx.fillRect(cx + r * 0.68, cy - r * 0.3, r * 0.32, r * 0.9);
  }
  // Eyes.
  ctx.fillStyle = '#3a2a1a';
  const eyeY = cy - r * 0.1;
  const eyeDX = r * 0.38;
  if (mood === 'happy') {
    // Closed, smiling eyes.
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 2;
    [-1, 1].forEach((s) => {
      ctx.beginPath();
      ctx.arc(cx + s * eyeDX, eyeY, r * 0.18, Math.PI, 0);
      ctx.stroke();
    });
  } else {
    [-1, 1].forEach((s) => {
      ctx.beginPath();
      ctx.arc(cx + s * eyeDX, eyeY, r * 0.13, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  // Worried eyebrows.
  if (mood === 'worried') {
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - eyeDX - r * 0.15, eyeY - r * 0.42);
    ctx.lineTo(cx - eyeDX + r * 0.15, eyeY - r * 0.28);
    ctx.moveTo(cx + eyeDX - r * 0.15, eyeY - r * 0.28);
    ctx.lineTo(cx + eyeDX + r * 0.15, eyeY - r * 0.42);
    ctx.stroke();
  }
  // Mouth.
  ctx.strokeStyle = '#3a2a1a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (mood === 'happy') {
    ctx.arc(cx, cy + r * 0.28, r * 0.4, 0.15 * Math.PI, 0.85 * Math.PI);
  } else if (mood === 'neutral') {
    ctx.moveTo(cx - r * 0.3, cy + r * 0.5);
    ctx.lineTo(cx + r * 0.3, cy + r * 0.5);
  } else {
    ctx.arc(cx, cy + r * 0.85, r * 0.4, 1.15 * Math.PI, 1.85 * Math.PI);
  }
  ctx.stroke();
  // Blush when happy, sweat drop when worried.
  if (mood === 'happy') {
    ctx.fillStyle = 'rgba(228,87,46,0.45)';
    ctx.beginPath();
    ctx.arc(cx - r * 0.55, cy + r * 0.3, r * 0.14, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.55, cy + r * 0.3, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
  } else if (mood === 'worried') {
    ctx.fillStyle = '#7fb8d8';
    ctx.beginPath();
    ctx.arc(cx + r * 0.7, cy - r * 0.45, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** One order ticket on the board. `now` drives the urgent pulse. */
export function drawTicket(ctx, order, x, y, w, h, plate, now) {
  const urgent = order.timeLeft <= 8;
  const pulse = urgent ? 0.5 + 0.5 * Math.sin(now / 130) : 0;
  // VIP tickets get a golden ticket: gold-tinted paper, thick gold border.
  ctx.fillStyle = order.vip ? '#ffedb0' : order.rush ? '#fff0e8' : '#fffdf6';
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = order.vip ? '#d99a1f' : order.rush ? '#e4572e' : urgent ? `rgba(228,87,46,${0.5 + pulse * 0.5})` : '#d8c9a8';
  ctx.lineWidth = order.vip || order.rush || urgent ? 3 : 2;
  roundRect(ctx, x, y, w, h, 12);
  ctx.stroke();
  if (order.vip) {
    // Outer gold shimmer ring.
    ctx.strokeStyle = 'rgba(217,154,31,0.45)';
    ctx.lineWidth = 2;
    roundRect(ctx, x + 4, y + 4, w - 8, h - 8, 10);
    ctx.stroke();
  }
  // The customer, with a mood that follows the timer.
  drawCustomerFace(ctx, order, x + 30, y + 30, 15);
  // Dish name + timer.
  ctx.fillStyle = '#3a2a1a';
  ctx.font = 'bold 19px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(order.recipe.name, x + 52, y + 30);
  if (order.vip) {
    ctx.fillStyle = '#8a6410';
    ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('★ VIP 2×', x + w - 14, y + 26);
  } else if (order.rush) {
    ctx.fillStyle = '#e4572e';
    ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('RUSH! x1.5', x + w - 14, y + 26);
  }
  ctx.fillStyle = urgent ? '#e4572e' : '#7a6a55';
  ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.ceil(order.timeLeft)}s`, x + w - 14, y + (order.vip || order.rush ? 48 : 30));
  // Needed ingredients as small icons, checked off when on the plate.
  const needed = order.recipe.needs;
  needed.forEach((id, i) => {
    const ix = x + 34 + i * 44;
    const iy = y + 66;
    const onPlate = plate.includes(id);
    ctx.fillStyle = onPlate ? '#d9eccf' : '#f3ead6';
    ctx.beginPath();
    ctx.arc(ix, iy, 17, 0, Math.PI * 2);
    ctx.fill();
    drawIngredientIcon(ctx, id, ix, iy, 26);
    if (onPlate) {
      ctx.strokeStyle = '#4e9b47';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ix - 7, iy);
      ctx.lineTo(ix - 2, iy + 6);
      ctx.lineTo(ix + 8, iy - 6);
      ctx.stroke();
    }
  });
  // Time bar.
  const ratio = Math.max(0, order.timeLeft / order.timeMax);
  ctx.fillStyle = '#e8ddc8';
  roundRect(ctx, x + 14, y + h - 16, w - 28, 8, 4);
  ctx.fill();
  ctx.fillStyle = ratio > 0.5 ? '#5da24a' : ratio > 0.25 ? '#f2a007' : '#e4572e';
  if (ratio > 0) {
    roundRect(ctx, x + 14, y + h - 16, (w - 28) * ratio, 8, 4);
    ctx.fill();
  }
}

/** The chopping board station. */
export function drawChopBoard(ctx, board, x, y, w, h, now) {
  ctx.fillStyle = '#fffdf6';
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = '#d8c9a8';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 12);
  ctx.stroke();
  ctx.fillStyle = '#3a2a1a';
  ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('CHOPPING BOARD', x + 12, y + 22);
  ctx.fillStyle = '#8a7a66';
  ctx.font = '12px "Trebuchet MS", sans-serif';
  ctx.fillText('click to chop  •  key X', x + 12, y + 40);
  if (board.item === null) {
    // Empty board: a knife resting on the wood.
    drawKnife(ctx, x + w / 2, y + 92, 0.5, 0);
    ctx.fillStyle = '#b09a7a';
    ctx.font = 'italic 14px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('add lettuce, tomato or onion', x + w / 2, y + h - 14);
  } else {
    // The item, with chop marks for each chop landed.
    drawIngredientIcon(ctx, board.item, x + w / 2 - 40, y + 92, 64);
    for (let i = 0; i < board.chops; i++) {
      ctx.strokeStyle = '#3a2a1a';
      ctx.lineWidth = 2;
      const cx = x + w / 2 - 40 + (i - 1) * 16;
      ctx.beginPath();
      ctx.moveTo(cx - 6, y + 66);
      ctx.lineTo(cx + 6, y + 118);
      ctx.stroke();
    }
    drawKnife(ctx, x + w / 2 + 80, y + 92, board.knifeFlash > 0 ? -0.9 : 0.5, board.knifeFlash);
    // Progress pips.
    for (let i = 0; i < CHOPS_TO_FINISH; i++) {
      ctx.fillStyle = i < board.chops ? '#4e9b47' : '#e8ddc8';
      ctx.beginPath();
      ctx.arc(x + w / 2 - 20 + i * 24, y + h - 16, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    if (board.done) {
      ctx.fillStyle = '#4e9b47';
      ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('CHOPPED — click to pass it', x + w - 12, y + 40);
    }
  }
}

/** A kitchen knife, drawn at an angle; flash lifts it for a chop. */
function drawKnife(ctx, x, y, angle, flash) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + (flash > 0 ? -0.5 * (flash / 0.22) : 0));
  ctx.fillStyle = '#c9c9c9';
  ctx.beginPath();
  ctx.moveTo(0, -34);
  ctx.lineTo(10, -10);
  ctx.lineTo(10, 6);
  ctx.lineTo(0, 10);
  ctx.lineTo(-4, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#5a4632';
  roundRect(ctx, -4, 10, 10, 26, 4);
  ctx.fill();
  ctx.restore();
}

/** The stove station: two burners with pans. */
export function drawStove(ctx, stove, x, y, w, h, now) {
  ctx.fillStyle = '#4a4a52';
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = '#2c2c34';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 12);
  ctx.stroke();
  ctx.fillStyle = '#f6e7ce';
  ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('STOVE', x + 12, y + 22);
  ctx.fillStyle = '#b9b9c4';
  ctx.font = '12px "Trebuchet MS", sans-serif';
  ctx.fillText('click a burner to take it  •  key F', x + 12, y + 40);
  stove.burners.forEach((burner, i) => {
    const bx = x + 110 + i * 220;
    const by = y + 96;
    // Burner ring + flame while cooking.
    ctx.fillStyle = '#2c2c34';
    ctx.beginPath();
    ctx.arc(bx, by, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1c1c22';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(bx, by, 52, 0, Math.PI * 2);
    ctx.stroke();
    if (burner.state === 'cooking') {
      const flicker = 0.9 + 0.15 * Math.sin(now / 90 + i * 2);
      drawFlame(ctx, bx - 24, by + 44, 0.8 * flicker);
      drawFlame(ctx, bx + 24, by + 44, 0.7 * flicker);
    }
    // The pan.
    ctx.fillStyle = burner.state === 'burned' ? '#1c1c1c' : '#6b6b76';
    ctx.beginPath();
    ctx.arc(bx, by, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = burner.state === 'burned' ? '#2e2e2e' : '#8a8a96';
    ctx.beginPath();
    ctx.arc(bx, by, 34, 0, Math.PI * 2);
    ctx.fill();
    if (burner.item !== null) {
      drawIngredientIcon(ctx, burner.item, bx, by, 46);
      if (burner.state === 'cooking') {
        // Cook progress ring.
        ctx.strokeStyle = '#f2a007';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(bx, by, 46, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (burner.seconds / FRY_READY_SECONDS));
        ctx.stroke();
      } else if (burner.state === 'ready') {
        const glow = 0.6 + 0.4 * Math.sin(now / 150);
        ctx.strokeStyle = `rgba(242,160,7,${glow})`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(bx, by, 46, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#f2a007';
        ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('READY!', bx, by - 48);
      } else if (burner.state === 'burned') {
        // Smoke curls.
        ctx.fillStyle = 'rgba(120,120,120,0.6)';
        const drift = (now / 40) % 20;
        ctx.beginPath();
        ctx.arc(bx - 8 + drift * 0.3, by - 44 - drift * 0.4, 7, 0, Math.PI * 2);
        ctx.arc(bx + 6, by - 52 - drift * 0.3, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e4572e';
        ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('BURNED!', bx, by - 48);
      }
    } else {
      ctx.fillStyle = '#9a9aa6';
      ctx.font = 'italic 13px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('empty burner', bx, by + 4);
    }
  });
}

/** The pass tray: finished prep waits here to be plated. */
export function drawPass(ctx, passIds, x, y, w, h) {
  ctx.fillStyle = '#e8eef1';
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = '#b9c4ca';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 12);
  ctx.stroke();
  ctx.fillStyle = '#3a2a1a';
  ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PASS', x + 12, y + 22);
  ctx.fillStyle = '#8a7a66';
  ctx.font = '12px "Trebuchet MS", sans-serif';
  ctx.fillText('click to plate  •  key T', x + 12, y + 40);
  for (let i = 0; i < 3; i++) {
    const sx = x + 60 + i * 112;
    const sy = y + 92;
    ctx.fillStyle = '#fff';
    roundRect(ctx, sx - 48, sy - 48, 96, 96, 10);
    ctx.fill();
    ctx.strokeStyle = '#c9d4d8';
    ctx.lineWidth = 2;
    roundRect(ctx, sx - 48, sy - 48, 96, 96, 10);
    ctx.stroke();
    if (i < passIds.length) {
      const item = ingredientById(passIds[i]);
      drawIngredientIcon(ctx, item.id, sx, sy - 8, 56);
      ctx.fillStyle = '#3a2a1a';
      ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.name, sx, sy + 40);
    } else {
      ctx.fillStyle = '#b9c4ca';
      ctx.font = 'italic 13px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('—', sx, sy);
    }
  }
}
