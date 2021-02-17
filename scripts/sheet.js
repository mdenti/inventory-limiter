import { ItemLocation } from './actor.js';

export async function initActorSheet() {
  console.log('inventory-limiter | ActorSheet setup.');
  const ActorSheet5eCharacter = game.dnd5e.applications.ActorSheet5eCharacter;

  class ActorSheet5eLimitedInventory extends ActorSheet5eCharacter {
    getData() {
      const data = super.getData();
      data.storedItems = data.inventory.map(function (section) {
        return Object.assign({}, section, {
          items: section.items.filter(function (item) { return item.flags.location === ItemLocation.Storage })
        });
      }).filter(function (section) { return section.items.length > 0; });
      data.backpackItems = data.inventory.map(function (section) {
        return Object.assign({}, section, {
          items: section.items.filter(function (item) { return item.flags.location === ItemLocation.Backpack })
        });
      }).filter(function (section) { return section.items.length > 0; });
      data.bagOfHoldingItems = data.inventory.map(function (section) {
        return Object.assign({}, section, {
          items: section.items.filter(function (item) { return item.flags.location === ItemLocation.BagOfHolding })
        });
      }).filter(function (section) { return section.items.length > 0; });
      data.inventory = data.inventory.map(function (section) {
        section.items = section.items.filter(function (item) {
          return !item.flags.location || item.flags.location === ItemLocation.Inventory;
        });
        return section;
      });
      return data;
    }

    async _renderInner(data, options) {
      let $html = await super._renderInner(data, options);
      $html = this._addInventoryAction($html, data);
      $html = this._addDisadvantageIndicator($html, data);
      $html = await this._addInventoryHeader($html, data);
      $html = await this._addBackpackView($html, data);
      $html = await this._addBagOfHoldingView($html, data);
      $html = await this._addItemStorageView($html, data);
      return $html;
    }

    _addInventoryAction($html, data) {
      const hasBackpack = data.data.attributes.hasBackpack;
      const hasBagOfHolding = data.data.attributes.hasBagOfHolding;

      const itemControls = $html.find('.inventory .item .item-controls');
      itemControls.prepend(
        '<a class="item-control item-move-to-storage" title="Move to storage"><i class="fas fa-archive"></i></a>'
      );
      if (hasBagOfHolding)
        itemControls.prepend(
          '<a class="item-control item-move-to-boh" title="Move to Bag of Holding"><i class="fas fa-shopping-bag"></i></a>'
        );
      if (hasBackpack)
        itemControls.prepend(
          '<a class="item-control item-move-to-backpack" title="Move to backpack"><i class="fas fa-briefcase"></i></a>'
        );
      return $html;
    }

    _addDisadvantageIndicator($html, data) {
      if (data.data.attributes.wearingBackpack) {
        const stealthSkillName = $html.find('[data-skill="ste"] .skill-name');
        stealthSkillName.append(' (D)');
        stealthSkillName.attr('title', 'You are wearing a backpack, you have disadvantage');
      }
      return $html;
    }

    async _addInventoryHeader($html, data) {
      const inventoryHeader = await renderTemplate('modules/inventory-limiter/templates/character-inventory-header.html', data);
      $html.find('.inventory .items-list.inventory-list').first().prepend(inventoryHeader);
      return $html;
    }

    async _addItemStorageView($html, data) {
      const storageView = await renderTemplate('modules/inventory-limiter/templates/character-item-storage.html', data);
      $html.find('.inventory .items-list.inventory-list').first().append(storageView);
      return $html;
    }

    async _addBackpackView($html, data) {
      if (!data.data.attributes.hasBackpack) return $html;
      const backpackView = await renderTemplate('modules/inventory-limiter/templates/character-backpack.html', data);
      $html.find('.inventory .items-list.inventory-list').first().append(backpackView);
      return $html;
    }

    async _addBagOfHoldingView($html, data) {
      if (!data.data.attributes.hasBagOfHolding) return $html;
      const bohView = await renderTemplate('modules/inventory-limiter/templates/character-bag-of-holding.html', data);
      $html.find('.inventory .items-list.inventory-list').first().append(bohView);
      return $html;
    }

    activateListeners(html) {
      super.activateListeners(html);

      html.find('.item-move-to-backpack').click(this._onMoveToBackpack.bind(this));
      html.find('.item-move-to-boh').click(this._onMoveToBagOfHolding.bind(this));
      html.find('.item-move-to-storage').click(this._onMoveToStorage.bind(this));
      html.find('.item-move-to-inventory').click(this._onMoveToInventory.bind(this));
    }

    _onMoveToBackpack(event) {  
      event.preventDefault();
      const itemId = event.currentTarget.closest('.item').dataset.itemId;
      this.actor.moveItemToBackpack(itemId);
    }

    _onMoveToBagOfHolding(event) {  
      event.preventDefault();
      const itemId = event.currentTarget.closest('.item').dataset.itemId;
      this.actor.moveItemToBagOfHolding(itemId);
    }

    _onMoveToStorage(event) {  
      event.preventDefault();
      const itemId = event.currentTarget.closest('.item').dataset.itemId;
      this.actor.moveItemToStorage(itemId);
    }

    _onMoveToInventory(event) {
      event.preventDefault();
      const itemId = event.currentTarget.closest('.item').dataset.itemId;
      this.actor.moveItemToInventory(itemId);
    }
  }

  Actors.unregisterSheet('dnd5e', ActorSheet5eCharacter)
  Actors.registerSheet('dnd5e', ActorSheet5eLimitedInventory, {
    types: ['character'],
    makeDefault: true,
    label: 'InvLim.SheetClassCharacter'
  });

  await loadTemplates([
    'modules/inventory-limiter/templates/character-inventory-header.html',
    'modules/inventory-limiter/templates/character-item-storage.html',
    'modules/inventory-limiter/templates/character-backpack.html',
    'modules/inventory-limiter/templates/character-bag-of-holding.html',
  ]);
}