import { MODULE_ID, Settings } from './settings.js';

function baseCarryLimit(actorData) {
  const baseLimit = game.settings.get(MODULE_ID, Settings.CarryLimit);
  const ability = game.settings.get(MODULE_ID, Settings.SelectedAbility);
  if (ability !== 'none') {
    const mod = actorData.data.abilities[ability].mod;
    return baseLimit + mod;
  }
  return baseLimit;
}

function carryLimit(actorData) {
  const bagOfHoldingSize = game.settings.get(MODULE_ID, Settings.BagOfHoldingSize);
  const hasBagOfHolding = (actorData.items || []).some(function (item) {
    return !item.flags.isStored && item.type === 'backpack' && item.name === 'Bag of Holding';
  });
  if (hasBagOfHolding) {
    return baseCarryLimit(actorData) + bagOfHoldingSize;
  }
  return baseCarryLimit(actorData);
}

function backpackCarryLimit(actorData) {
  const backpackSize = game.settings.get(MODULE_ID, Settings.BackpackSize);
  return carryLimit(actorData) + backpackSize;
}

function carriedItems(actorData) {
  return (actorData.items || []).reduce(function (acc, item) {
    if (!item.flags.isStored && item.data.weight) {
      return acc + (item.data.consumableType === 'ammo' ? 1 : item.data.quantity);
    }
    return acc;
  }, 0);
}

function carryLimitExceeded(actorData) {
  return carriedItems(actorData) > carryLimit(actorData);
}

function backpackCarryLimitExceeded(actorData) {
  return carriedItems(actorData) > backpackCarryLimit(actorData);
}

export function initActor() {
  console.log('inventory-limiter | Actor setup.');
  const Actor5e = game.dnd5e.entities.Actor5e;

  class Actor5eLimitedInventory extends Actor5e {
    prepareDerivedData() {
      super.prepareDerivedData();
      const actorData = this.data;
      const data = actorData.data;
      data.attributes.carryLimit = carryLimit(actorData);
      data.attributes.backpackCarryLimit = backpackCarryLimit(actorData);
      data.attributes.carriedItems = carriedItems(actorData);
      data.attributes.carryLimitExceeded = carryLimitExceeded(actorData);
      data.attributes.backpackCarryLimitExceeded = backpackCarryLimitExceeded(actorData);
    }

    rollSkill(skillId, options = {}) {
      const actorData = this.data;
      const data = actorData.data;
      // Add stealth disadvantage if inventory limit is exceeded
      if (skillId === 'ste' && data.attributes.carryLimitExceeded) {
        const chatData = {
          content: `<div class="invlim-reminder-text">${actorData.name} is wearing a backpack, disadvantage to stealth rolls!</div>`,
          type: 0,
          speaker: {
            alias: 'Reminder',
            scene: game.user.viewedScene,
          },
        };
        ChatMessage.create(chatData, {});
        const stealthRollOptions = mergeObject(options, {
          advantage: false,
          disadvantage: options.advantage ? false : true,
        });
        return super.rollSkill(skillId, stealthRollOptions);
      }
      return super.rollSkill(skillId, options);
    }

    async moveItemToStorage(itemId) {
      await this.updateOwnedItem({ _id: itemId, data: { equipped: false }, flags: { isStored: true }});
    }
    
    async moveItemToInventory(itemId) {
      await this.updateOwnedItem({ _id: itemId, flags: { isStored: false }});
    }
  }

  CONFIG.Actor.entityClass = Actor5eLimitedInventory;
}