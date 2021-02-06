import { initActor } from './actor.js';
import { initActorSheet } from './sheet.js';
import { registerSettings } from './settings.js';

Hooks.once('setup', async function () {
  console.log('inventory-limiter | Setup.');
  
  registerSettings();
  initActor();
  await initActorSheet();
});

