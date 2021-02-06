export async function initActorSheet() {
  console.log('inventory-limiter | ActorSheet setup.');
  const ActorSheet5eCharacter = game.dnd5e.applications.ActorSheet5eCharacter;

  class ActorSheet5eLimitedInventory extends ActorSheet5eCharacter {
    getData() {
      const data = super.getData();
      data.storedItems = data.inventory.reduce(function (acc, section) {
        for (const item of section.items) {
          if (item.flags.isStored) acc.push(item);
        }
        return acc;
      }, []);
      data.inventory = data.inventory.map(function (section) {
        section.items = section.items.filter(function (item) {
          return !item.flags.isStored;
        });
        return section;
      });
      return data;
    }

    async _renderInner(data, options) {
      let $html = await super._renderInner(data, options);
      $html = this._addInventoryAction($html);
      $html = this._addInventoryLimitTracker($html, data);
      $html = await this._addStorageItemsView($html, data);
      return $html;
    }

    _addInventoryAction($html) {
      $html.find('.item .item-controls').prepend(
        '<a class="item-control item-move-to-storage" title="Move to storage"><i class="fas fa-boxes"></i></a>'
      );
      return $html;
    }

    _addInventoryLimitTracker($html, data) {
      const attributes = data.data.attributes;
      $html.find('.items-list.inventory-list').prepend(`
        <li class="items-header flexrow">
          <h3 class="item-name ${attributes.backpackCarryLimitExceeded ? 'invlim-error' : ''}">
            Carried items: ${attributes.carriedItems}/${attributes.carryLimitExceeded ? attributes.backpackCarryLimit : attributes.carryLimit}
          ${attributes.backpackCarryLimitExceeded
            ? `<i class="fas fa-exclamation-triangle invlim-error-icon" title="You've exceeded the amount of items you can carry with a backpack!"></i>`
            : attributes.carryLimitExceeded 
              ? `<i class="fas fa-exclamation-triangle invlim-warning-icon" title="You're using a backpack now, you'll have disadvantage to stealth checks"></i>`
              : ''
          }
          </h3>
        </li>
      `);
      return $html;
    }

    async _addStorageItemsView($html, data) {
      const storageView = await renderTemplate('modules/inventory-limiter/templates/character-item-storage.html', data);
      $html.find('.items-list.inventory-list').append(storageView);
      return $html;
    }

    activateListeners(html) {
      super.activateListeners(html);

      html.find('.item-move-to-storage').click(this._onMoveToStorage.bind(this));
      html.find('.item-storage-move-to-inventory').click(this._onMoveToInventory.bind(this));
      html.find('.item-storage-delete').click(this._onDeleteFromStorage.bind(this));
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

    _onDeleteFromStorage(event) {
      event.preventDefault();
      const itemId = event.currentTarget.closest('.item').dataset.itemId;
      this.actor.deleteOwnedItem(itemId);
    }
  }

  Actors.unregisterSheet('dnd5e', ActorSheet5eCharacter)
  Actors.registerSheet('dnd5e', ActorSheet5eLimitedInventory, {
    types: ['character'],
    makeDefault: true,
    label: 'InvLim.SheetClassCharacter'
  });

  await loadTemplates([
    'modules/inventory-limiter/templates/character-item-storage.html',
  ]);
}