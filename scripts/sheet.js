import { ItemLocation } from './actor.js';

export async function initActorSheet() {
  console.log('inventory-limiter | ActorSheet setup.');

  if (!libWrapper) {
    console.error('inventory-limiter | LibWrapper not available, ActorSheet setup not possible.')
    return;
  }

  function getItemLocation(item) {
    return item.flags['inventory-limiter'] && item.flags['inventory-limiter'].location;
  }
  
  libWrapper.register('inventory-limiter', 'game.dnd5e.applications.ActorSheet5eCharacter.prototype.getData', function (getData, ...args) {
    const data = getData(...args);

    data.storedItems = data.inventory.map(function (section) {
      return Object.assign({}, section, {
        items: section.items.filter(function (item) { return getItemLocation(item) === ItemLocation.Storage })
      });
    }).filter(function (section) { return section.items.length > 0; });
    data.backpackItems = data.inventory.map(function (section) {
      return Object.assign({}, section, {
        items: section.items.filter(function (item) { return getItemLocation(item) === ItemLocation.Backpack })
      });
    }).filter(function (section) { return section.items.length > 0; });
    data.bagOfHoldingItems = data.inventory.map(function (section) {
      return Object.assign({}, section, {
        items: section.items.filter(function (item) { return getItemLocation(item) === ItemLocation.BagOfHolding })
      });
    }).filter(function (section) { return section.items.length > 0; });
    data.inventory = data.inventory.map(function (section) {
      section.items = section.items.filter(function (item) {
        return !getItemLocation(item) || getItemLocation(item) === ItemLocation.Inventory;
      });
      return section;
    });

    return data;

  }, 'MIXED');

  libWrapper.register('inventory-limiter', 'game.dnd5e.applications.ActorSheet5eCharacter.prototype._renderInner', async function (_renderInner, data, options) {
    let $html = await _renderInner(data, options);

    $html = this.invlim_addInventoryAction($html, data);
    $html = this.invlim_addDisadvantageIndicator($html, data);
    $html = await this.invlim_addInventoryHeader($html, data);
    $html = await this.invlim_addBackpackView($html, data);
    $html = await this.invlim_addBagOfHoldingView($html, data);
    $html = await this.invlim_addItemStorageView($html, data);

    return $html;
  }, 'MIXED');

  game.dnd5e.applications.ActorSheet5eCharacter.prototype.invlim_addInventoryAction = function ($html, data) {
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
  };

  game.dnd5e.applications.ActorSheet5eCharacter.prototype.invlim_addDisadvantageIndicator = function ($html, data) {
    if (data.data.attributes.wearingBackpack) {
      const stealthSkillName = $html.find('[data-skill="ste"] .skill-name');
      stealthSkillName.append(' (D)');
      stealthSkillName.attr('title', 'You are wearing a backpack, you have disadvantage');
    }
    return $html;
  };

  game.dnd5e.applications.ActorSheet5eCharacter.prototype.invlim_addInventoryHeader = async function ($html, data) {
    const inventoryHeader = await renderTemplate('modules/inventory-limiter/templates/character-inventory-header.html', data);
    $html.find('.inventory .items-list.inventory-list').first().prepend(inventoryHeader);
    return $html;
  };

  game.dnd5e.applications.ActorSheet5eCharacter.prototype.invlim_addItemStorageView = async function ($html, data) {
    const storageView = await renderTemplate('modules/inventory-limiter/templates/character-item-storage.html', data);
    $html.find('.inventory .items-list.inventory-list').first().append(storageView);
    return $html;
  };

  game.dnd5e.applications.ActorSheet5eCharacter.prototype.invlim_addBackpackView = async function ($html, data) {
    if (!data.data.attributes.hasBackpack) return $html;
    const backpackView = await renderTemplate('modules/inventory-limiter/templates/character-backpack.html', data);
    $html.find('.inventory .items-list.inventory-list').first().append(backpackView);
    return $html;
  };

  game.dnd5e.applications.ActorSheet5eCharacter.prototype.invlim_addBagOfHoldingView = async function ($html, data) {
    if (!data.data.attributes.hasBagOfHolding) return $html;
    const bohView = await renderTemplate('modules/inventory-limiter/templates/character-bag-of-holding.html', data);
    $html.find('.inventory .items-list.inventory-list').first().append(bohView);
    return $html;
  };

  libWrapper.register('inventory-limiter', 'game.dnd5e.applications.ActorSheet5eCharacter.prototype.activateListeners', function (activateListeners, html) {
    const result = activateListeners(html);

    html.find('.item-move-to-backpack').click(this.invlim_onMoveToBackpack.bind(this));
    html.find('.item-move-to-boh').click(this.invlim_onMoveToBagOfHolding.bind(this));
    html.find('.item-move-to-storage').click(this.invlim_onMoveToStorage.bind(this));
    html.find('.item-move-to-inventory').click(this.invlim_onMoveToInventory.bind(this));
    
    return result;
  }, 'MIXED');

  game.dnd5e.applications.ActorSheet5eCharacter.prototype.invlim_onMoveToBackpack = function (event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest('.item').dataset.itemId;
    this.actor.invlim_moveItemToBackpack(itemId);
  };

  game.dnd5e.applications.ActorSheet5eCharacter.prototype.invlim_onMoveToBagOfHolding = function (event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest('.item').dataset.itemId;
    this.actor.invlim_moveItemToBagOfHolding(itemId);
  };

  game.dnd5e.applications.ActorSheet5eCharacter.prototype.invlim_onMoveToStorage = function (event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest('.item').dataset.itemId;
    this.actor.invlim_moveItemToStorage(itemId);
  };

  game.dnd5e.applications.ActorSheet5eCharacter.prototype.invlim_onMoveToInventory = function (event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest('.item').dataset.itemId;
    this.actor.invlim_moveItemToInventory(itemId);
  };

  await loadTemplates([
    'modules/inventory-limiter/templates/character-inventory-header.html',
    'modules/inventory-limiter/templates/character-item-storage.html',
    'modules/inventory-limiter/templates/character-backpack.html',
    'modules/inventory-limiter/templates/character-bag-of-holding.html',
  ]);
}