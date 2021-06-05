import { initActor } from './actor.js';
import { initActorSheet } from './sheet.js';
import { registerSettings } from './settings.js';

Hooks.once('ready', () => {
  if(!game.modules.get('lib-wrapper')?.active && game.user.isGM)
      ui.notifications.error("Module 'TPoaJ - Inventory Limiter' requires the 'libWrapper' module. Please install and activate it.");
});

Hooks.once('setup', async function () {
  console.log('inventory-limiter | Setup.');
  
  registerSettings();
  initActor();
  await initActorSheet();
});

