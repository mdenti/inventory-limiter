import { MODULE_ID, Settings } from './settings.js';

export const ItemLocation = {
  Inventory: 'inventory',
  Backpack: 'backpack',
  BagOfHolding: 'bagofholding',
  Storage: 'storage',
};

function carryLimit(actorData) {
  const baseLimit = game.settings.get(MODULE_ID, Settings.CarryLimit);
  const ability = game.settings.get(MODULE_ID, Settings.SelectedAbility);
  if (ability !== 'none') {
    const mod = actorData.data.abilities[ability].mod;
    return baseLimit + mod;
  }
  return baseLimit;
}

function getItemCarryCount(item) {
  // plutonium import fix
  if (!item.data || !item.data.data) return 1;

  if (getProperty(item.data, 'data.consumableType') === 'ammo') return 1;
  if (item.type === 'weapon' && getProperty(item.data, 'data.weaponType') === 'simpleR' && (+getProperty(item.data, 'data.weight') < 0.5)) return 1; // darts
  if (item.type === 'consumable' && (item.name === 'Caltrops' || item.name === 'Ball Bearings')) return 1;

  return +getProperty(item.data, 'data.quantity');
}

function getItemsCountAtLocation(actorData, itemLocation) {
  return actorData.items.reduce(function (acc, item) {
    if (item.getFlag('inventory-limiter', 'location') === itemLocation && getProperty(item.data, 'data.weight')) {
      return acc + getItemCarryCount(item);
    }
    return acc;
  }, 0);
}

function isBackpack(item) {
  return item.type === 'backpack' && (item.name === 'Backpack' || item.name === 'Sack');
}

function getBackpack(items) {
  return items.filter(isBackpack)[0];
}

function isBagOfHolding(item) {
  return item.type === 'backpack' && item.name === 'Bag of Holding';
}

function getBagOfHolding(items) {
  return items.filter(isBagOfHolding)[0];
}

export function initActor() {
  console.log('inventory-limiter | Actor setup.');

  if (!libWrapper) {
    console.error('inventory-limiter | LibWrapper not available, Actor setup not possible.')
    return;
  }

  game.dnd5e.entities.Actor5e.prototype.invlim_toggleLimiter = function () {
    return this.setFlag('inventory-limiter', 'limiter-enabled', !this.invlim_limiterEnabled());
  };

  game.dnd5e.entities.Actor5e.prototype.invlim_limiterEnabled = function () {
    return !!this.getFlag('inventory-limiter', 'limiter-enabled');
  };

  libWrapper.register('inventory-limiter', 'game.dnd5e.entities.Actor5e.prototype.prepareDerivedData', function (prepareDerivedData, ...args) {
    const result = prepareDerivedData(...args);
    if (!this.invlim_limiterEnabled()) return result;

    const actorData = this.data;
    const data = actorData.data;
    (actorData.items || []).forEach(function (item) {
      if(!item.getFlag('inventory-limiter', 'location')) item.setFlag('inventory-limiter', 'location', ItemLocation.Inventory);
    });

    data.attributes.inventoryItemsCount = getItemsCountAtLocation(actorData, ItemLocation.Inventory);
    data.attributes.inventoryLimit = carryLimit(actorData);
    data.attributes.inventoryFull = data.attributes.inventoryItemsCount >= data.attributes.inventoryLimit;
    data.attributes.inventorySizeExceeded = data.attributes.inventoryItemsCount > data.attributes.inventoryLimit;

    const backpack = getBackpack(actorData.items);
    data.attributes.hasBackpack = !!backpack;
    data.attributes.wearingBackpack = !!backpack && backpack.data.data.equipped;
    data.attributes.backpackItemsCount = getItemsCountAtLocation(actorData, ItemLocation.Backpack);
    data.attributes.backpackLimit = game.settings.get(MODULE_ID, Settings.BackpackSize);
    data.attributes.backpackFull = data.attributes.backpackItemsCount >= data.attributes.backpackLimit;
    data.attributes.backpackSizeExceeded = data.attributes.backpackItemsCount > data.attributes.backpackLimit;
    
    const bagOfHolding = getBagOfHolding(actorData.items);
    data.attributes.hasBagOfHolding = !!bagOfHolding;
    data.attributes.wearingBagOfHolding = !!bagOfHolding && bagOfHolding.data.data.equipped;
    data.attributes.bagOfHoldingItemsCount = getItemsCountAtLocation(actorData, ItemLocation.BagOfHolding);
    data.attributes.bagOfHoldingLimit = game.settings.get(MODULE_ID, Settings.BagOfHoldingSize);
    data.attributes.bagOfHoldingFull = data.attributes.bagOfHoldingItemsCount >= data.attributes.bagOfHoldingLimit;
    data.attributes.bagOfHoldingSizeExceeded = data.attributes.bagOfHoldingItemsCount > data.attributes.bagOfHoldingLimit;

    return result;
  }, 'WRAPPER');

  libWrapper.register('inventory-limiter', 'game.dnd5e.entities.Actor5e.prototype.rollSkill', function (rollSkill, skillId, options) {
    if (!this.invlim_limiterEnabled()) return rollSkill(skillId, options);

    const actorData = this.data;
    const data = actorData.data;

    // Add stealth disadvantage if inventory limit is exceeded
    if (skillId === 'ste' && data.attributes.wearingBackpack) {
      const stealthRollOptions = mergeObject(options, {
        advantage: false,
        disadvantage: options.advantage ? false : true,
      });
      return new Promise(function (resolve) {
        new Dialog({
          content:
            'You are wearing a backpack. Stealth checks are at a disadvantage!',
          buttons: {
            ok: {
              label: 'Aight',
              callback: function () {
                rollSkill(skillId, stealthRollOptions);
              },
            },
          },
          close: resolve,
        }).render(true);
      });
    }
    return rollSkill(skillId, options);
  }, 'MIXED');

  libWrapper.register('inventory-limiter', 'game.dnd5e.entities.Actor5e.prototype._onCreateEmbeddedDocuments', function (_onCreateEmbeddedDocuments, embeddedName, documents, ...args) {
    if (this.invlim_limiterEnabled() && embeddedName === 'Item') {
      const addedCarry = (documents || []).reduce(function (acc, item) {
        return acc + getItemCarryCount(item);
      }, 0);
      if (this.data.data.attributes.inventoryItemsCount + addedCarry > this.data.data.attributes.inventoryLimit)
        ui.notifications.warn('Your Inventory is full! Move some items to other storages.');
    }
    return _onCreateEmbeddedDocuments(embeddedName, documents, ...args);
  }, 'WRAPPER');

  libWrapper.register('inventory-limiter', 'game.dnd5e.entities.Actor5e.prototype._onDeleteEmbeddedDocuments', function (_onDeleteEmbeddedDocuments, embeddedName, documents, ...args) {
    if (this.invlim_limiterEnabled() && embeddedName === 'Item') {
      if (documents.some(isBackpack)) {
        this.items.forEach(function (item) {
          if (item.getFlag('inventory-limiter', 'location') === ItemLocation.Backpack) {
            item.setFlag('inventory-limiter', 'location', ItemLocation.Inventory);
          }
        });
      }
      if (documents.some(isBagOfHolding)) {
        this.items.forEach(function (item) {
          if (item.getFlag('inventory-limiter', 'location') === ItemLocation.BagOfHolding) {
            item.setFlag('inventory-limiter', 'location', ItemLocation.Inventory);
          }
        });
      }
    }
    return _onDeleteEmbeddedDocuments(embeddedName, documents, ...args);
  }, 'WRAPPER');

  game.dnd5e.entities.Actor5e.prototype.invlim_moveItemToStorage = async function (itemId) {
    const item = this.items.get(itemId);
    await item.update({ 'data.equipped': false, 'data.attuned': false });
    await item.setFlag('inventory-limiter', 'location', ItemLocation.Storage);
  };

  game.dnd5e.entities.Actor5e.prototype.invlim_moveItemToBackpack = async function (itemId) {
    const item = this.items.get(itemId);
    if (this.data.data.attributes.backpackItemsCount + getItemCarryCount(item) > this.data.data.attributes.backpackLimit)
      ui.notifications.warn('Your Backpack is full! Move some items to other storages.');
    await item.update({ 'data.equipped': false });
    await item.setFlag('inventory-limiter', 'location', ItemLocation.Backpack);
  };

  game.dnd5e.entities.Actor5e.prototype.invlim_moveItemToBagOfHolding = async function (itemId) {
    const item = this.items.get(itemId);
    if (this.data.data.attributes.bagOfHoldingItemsCount + getItemCarryCount(item) > this.data.data.attributes.bagOfHoldingLimit)
      ui.notifications.warn('Your Bag of Holding is full! Move some items to other storages.');
    await item.update({ 'data.equipped': false });
    await item.setFlag('inventory-limiter', 'location', ItemLocation.BagOfHolding);
  };

  game.dnd5e.entities.Actor5e.prototype.invlim_moveItemToInventory = async function (itemId) {
    const item = this.items.get(itemId);
    if (this.data.data.attributes.inventoryItemsCount + getItemCarryCount(item) > this.data.data.attributes.inventoryLimit)
      ui.notifications.warn('Your Inventory is full! Move some items to other storages.');
    await item.setFlag('inventory-limiter', 'location', ItemLocation.Inventory);
  };
}
