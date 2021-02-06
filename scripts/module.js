import { initActor } from './actor.js';
import { initActorSheet } from './sheet.js';

function registerSettings() {
  console.log('inventory-limiter | Registering settings.');
  game.settings.register("inventory-limiter", "CarryLimit", {
    name: "Character's carry limit",
    hint: "Amount of items the character can carry without using a backpack",
    scope: "world",
    config: true,
    type: Number,
    default: 8
  });
  game.settings.register("inventory-limiter", "BackpackSize", {
    name: "Backpack capacity",
    hint: "Amount of additional items the character can carry if they use a backpack",
    scope: "world",
    config: true,
    type: Number,
    default: 8
  });
  game.settings.register("inventory-limiter", "BagOfHoldingSize", {
    name: "Bag of Holding capacity",
    hint: "Amount of additional items the character can carry if they carry a bag of holding",
    scope: "world",
    config: true,
    type: Number,
    default: 20
  });
}

Hooks.once('setup', async function () {
  console.log('inventory-limiter | Setup.');
  
  registerSettings();
  initActor();
  await initActorSheet();
});

