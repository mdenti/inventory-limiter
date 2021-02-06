export const MODULE_ID = 'inventory-limiter';
export const Settings = {
  CarryLimit: 'CarryLimit',
  BackpackSize: 'BackpackSize',
  BagOfHoldingSize: 'BagOfHoldingSize',
  SelectedAbility: 'SelectedAbility',
};

export function registerSettings() {
  console.log('inventory-limiter | Registering settings.');
  game.settings.register(MODULE_ID, Settings.CarryLimit, {
    name: "Character's carry limit",
    hint: 'Amount of items the character can carry without using a backpack',
    scope: 'world',
    config: true,
    type: Number,
    default: 8
  });
  game.settings.register(MODULE_ID, Settings.SelectedAbility, {
    name: 'Add ability modifier',
    hint: 'Increase carry limit by this modifier.',
    scope: 'world',
    config: true,
    type: String,
    default: 'str',
    choices: {
      none: '-------',
      str: 'Strength',
      dex: 'Dexerity',
      con: 'Constitution',
      int: 'Intelligence',
      wis: 'Wisdom',
      cha: 'Charisma',
    }
  });
  game.settings.register(MODULE_ID, Settings.BackpackSize, {
    name: 'Backpack capacity',
    hint: 'Amount of additional items the character can carry if they use a backpack',
    scope: 'world',
    config: true,
    type: Number,
    default: 8
  });
  game.settings.register(MODULE_ID, Settings.BagOfHoldingSize, {
    name: 'Bag of Holding capacity',
    hint: 'Amount of additional items the character can carry if they carry a bag of holding',
    scope: 'world',
    config: true,
    type: Number,
    default: 20
  });
}