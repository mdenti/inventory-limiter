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
  if (item.data.consumableType === 'ammo') return 1;
  if (item.type === 'weapon' && item.data.weaponType === 'simpleR' && (+item.data.weight) < 0.5) return 1; // darts
  if (item.type === 'consumable' && (item.name === 'Caltrops' || item.name === 'Ball Bearings')) return 1;

  return +item.data.quantity;
}

function getItemsCountAtLocation(actorData, itemLocation) {
  return actorData.items.reduce(function (acc, item) {
    if (item.flags.location === itemLocation && item.data.weight) {
      return acc + getItemCarryCount(item);
    }
    return acc;
  }, 0);
}

function getBackpack(items) {
  return items.filter(function (item) {
    return item.type === 'backpack' && (item.name === 'Backpack' || item.name === 'Sack');
  })[0];
}

function getBagOfHolding(items) {
  return items.filter(function (item) {
    return item.type === 'backpack' && item.name === 'Bag of Holding';
  })[0];
}

export function initActor() {
  console.log('inventory-limiter | Actor setup.');
  const Actor5e = game.dnd5e.entities.Actor5e;

  class Actor5eLimitedInventory extends Actor5e {
    prepareDerivedData() {
      super.prepareDerivedData();
      const actorData = this.data;
      const data = actorData.data;
      actorData.items = (actorData.items || []).map(function (item) {
        item.flags.location = item.flags.location || ItemLocation.Inventory;
        return item;
      });

      data.attributes.inventoryItemsCount = getItemsCountAtLocation(actorData, ItemLocation.Inventory);
      data.attributes.inventoryLimit = carryLimit(actorData);
      data.attributes.inventoryFull = data.attributes.inventoryItemsCount >= data.attributes.inventoryLimit;
      data.attributes.inventorySizeExceeded = data.attributes.inventoryItemsCount > data.attributes.inventoryLimit;

      const backpack = getBackpack(actorData.items);
      data.attributes.hasBackpack = !!backpack;
      data.attributes.wearingBackpack = !!backpack && backpack.data.equipped;
      data.attributes.backpackItemsCount = getItemsCountAtLocation(actorData, ItemLocation.Backpack);
      data.attributes.backpackLimit = game.settings.get(MODULE_ID, Settings.BackpackSize);
      data.attributes.backpackFull = data.attributes.backpackItemsCount >= data.attributes.backpackLimit;
      data.attributes.backpackSizeExceeded = data.attributes.backpackItemsCount > data.attributes.backpackLimit;
      
      const bagOfHolding = getBagOfHolding(actorData.items);
      data.attributes.hasBagOfHolding = !!bagOfHolding;
      data.attributes.wearingBagOfHolding = !!bagOfHolding && bagOfHolding.data.equipped;
      data.attributes.bagOfHoldingItemsCount = getItemsCountAtLocation(actorData, ItemLocation.BagOfHolding);
      data.attributes.bagOfHoldingLimit = game.settings.get(MODULE_ID, Settings.BagOfHoldingSize);
      data.attributes.bagOfHoldingFull = data.attributes.bagOfHoldingItemsCount >= data.attributes.bagOfHoldingLimit;
      data.attributes.bagOfHoldingSizeExceeded = data.attributes.bagOfHoldingItemsCount > data.attributes.bagOfHoldingLimit;
    }

    rollSkill(skillId, options = {}) {
      const actorData = this.data;
      const data = actorData.data;
      // Add stealth disadvantage if inventory limit is exceeded
      if (skillId === 'ste' && data.attributes.wearingBackpack) {
        const stealthRollOptions = mergeObject(options, {
          advantage: false,
          disadvantage: options.advantage ? false : true,
        });
        const rollSkill = super.rollSkill.bind(this);
        return new Dialog({
          content:
            'You are wearing a backpack. Stealth checks are at a disadvantage!',
          buttons: {
            ok: {
              label: 'Aight',
              callback: function () {
                return rollSkill(skillId, stealthRollOptions);
              },
            },
          },
        }).render(true);
      }
      return super.rollSkill(skillId, options);
    }

    async moveItemToStorage(itemId) {
      await this.updateOwnedItem({
        _id: itemId,
        data: { equipped: false, attuned: false },
        flags: { location: ItemLocation.Storage },
      });
    }

    async moveItemToBackpack(itemId) {
      const item = this.getOwnedItem(itemId);
      if (this.data.data.attributes.backpackItemsCount + getItemCarryCount(item.data) > this.data.data.attributes.backpackLimit)
        ui.notifications.warn('Your Backpack is full! Move some items to other storages.');

      await this.updateOwnedItem({
        _id: itemId,
        data: { equipped: false },
        flags: { location: ItemLocation.Backpack },
      });
    }

    async moveItemToBagOfHolding(itemId) {
      const item = this.getOwnedItem(itemId);
      if (this.data.data.attributes.bagOfHoldingItemsCount + getItemCarryCount(item.data) > this.data.data.attributes.bagOfHoldingLimit)
        ui.notifications.warn('Your Bag of Holding is full! Move some items to other storages.');
      await this.updateOwnedItem({
        _id: itemId,
        data: { equipped: false },
        flags: { location: ItemLocation.BagOfHolding },
      });
    }

    async moveItemToInventory(itemId) {
      const item = this.getOwnedItem(itemId);
      if (this.data.data.attributes.inventoryItemsCount + getItemCarryCount(item.data) > this.data.data.attributes.inventoryLimit)
        ui.notifications.warn('Your Inventory is full! Move some items to other storages.');
      await this.updateOwnedItem({ _id: itemId, flags: { location: ItemLocation.Inventory } });
    }

    /** @Override */
    _preCreateOwnedItem(itemData, options) {
      if (this.data.data.attributes.inventoryItemsCount + getItemCarryCount(itemData) > this.data.data.attributes.inventoryLimit)
        ui.notifications.warn('Your Inventory is full! Move some items to other storages.');
      return super._preCreateOwnedItem(itemData, options);
    }
  }

  CONFIG.Actor.entityClass = Actor5eLimitedInventory;
}
