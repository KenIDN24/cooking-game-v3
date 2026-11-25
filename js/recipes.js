/* Sizzle & Serve v2 — the pantry: every ingredient, its prep, and
   every recipe. A recipe is a set of ingredient ids; the order the
   player adds them in does not matter. The puzzle is routing: some
   ingredients go straight to the plate, some must be chopped first,
   some must be fried on the stove — and the board only ever shows
   three tickets at once, so the player picks which dish to build. */

/** How an ingredient reaches the plate. */
export const PREP = {
  none: 'none', // straight from the bin to the plate
  chop: 'chop', // three chops on the board, then the pass
  fry: 'fry', // fries on a burner, then the pass
};

/** One thing the player can grab from the counter. */
export const INGREDIENTS = [
  { id: 'bun',      name: 'Bun',      key: '1', prep: PREP.none, color: '#e8a54b', dark: '#c47f2a' },
  { id: 'patty',    name: 'Patty',    key: '2', prep: PREP.fry,  color: '#7a4a26', dark: '#54301a' },
  { id: 'lettuce',  name: 'Lettuce',  key: '3', prep: PREP.chop, color: '#5da24a', dark: '#3e7a30' },
  { id: 'tomato',   name: 'Tomato',   key: '4', prep: PREP.chop, color: '#e4572e', dark: '#b23a1c' },
  { id: 'cheese',   name: 'Cheese',   key: '5', prep: PREP.none, color: '#f6c453', dark: '#d99a1f' },
  { id: 'pasta',    name: 'Pasta',    key: '6', prep: PREP.none, color: '#f2d492', dark: '#c9a85e' },
  { id: 'sauce',    name: 'Sauce',    key: '7', prep: PREP.none, color: '#c0392b', dark: '#8e2418' },
  { id: 'tortilla', name: 'Tortilla', key: '8', prep: PREP.none, color: '#f0d9a8', dark: '#c9a869' },
  { id: 'egg',      name: 'Egg',      key: '9', prep: PREP.fry,  color: '#f7e8b0', dark: '#e0a800' },
  { id: 'onion',    name: 'Onion',    key: '0', prep: PREP.chop, color: '#e8d5f2', dark: '#a678c2' },
];

/** A dish the order board can ask for. */
export const RECIPES = [
  { id: 'burger',      name: 'Burger',       needs: ['bun', 'patty', 'lettuce', 'tomato'], base: 100 },
  { id: 'cheeseburger', name: 'Cheeseburger', needs: ['bun', 'patty', 'cheese', 'tomato'],  base: 120 },
  { id: 'pasta',       name: 'Pasta Alfredo', needs: ['pasta', 'sauce', 'cheese'],          base: 110 },
  { id: 'taco',        name: 'Crunch Taco',  needs: ['tortilla', 'patty', 'lettuce', 'cheese'], base: 130 },
  { id: 'salad',       name: 'Garden Salad', needs: ['lettuce', 'tomato', 'cheese'],         base: 90 },
  { id: 'omelette',    name: 'Omelette',     needs: ['egg', 'cheese', 'tomato'],             base: 125 },
  { id: 'spicytaco',   name: 'Spicy Taco',   needs: ['tortilla', 'patty', 'sauce', 'onion'], base: 135 },
  { id: 'wrap',        name: 'Veggie Wrap',  needs: ['tortilla', 'lettuce', 'tomato', 'onion'], base: 105 },
];

/** The ingredient record for an id, or undefined. */
export function ingredientById(id) {
  return INGREDIENTS.find((item) => item.id === id);
}

/** The recipe record for an id, or undefined. */
export function recipeById(id) {
  return RECIPES.find((dish) => dish.id === id);
}

/** Which prep an ingredient needs before it can be plated. */
export function prepOf(id) {
  return ingredientById(id)?.prep ?? PREP.none;
}

/** True when the plate's ingredient ids are exactly a recipe's set. */
export function recipeFor(plateIds) {
  const sorted = [...plateIds].sort().join(',');
  return RECIPES.find((dish) => [...dish.needs].sort().join(',') === sorted);
}

/** How many of a recipe's ingredients the plate already holds. */
export function matchingCount(plateIds, recipe) {
  return recipe.needs.filter((id) => plateIds.includes(id)).length;
}

/** The ingredients of a recipe the plate is still missing. */
export function missingIngredients(plateIds, recipe) {
  return recipe.needs.filter((id) => !plateIds.includes(id));
}

/** A random recipe, weighted so every dish can appear. */
export function randomRecipe() {
  return RECIPES[Math.floor(Math.random() * RECIPES.length)];
}
