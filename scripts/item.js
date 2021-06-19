export function initItem() {
  console.log('inventory-limiter | Item setup.');

  if (!libWrapper) {
    console.error('inventory-limiter | LibWrapper not available, Item setup not possible.')
    return;
  }

  game.dnd5e.entities.Item5e.prototype.invlim_canStack = function () {
    if (!this.data || !this.data.data) return false;
    // sensible defaults for existing items
    if (getProperty(this.data, 'data.consumableType') === 'ammo') return true;
    if (this.type === 'weapon' && getProperty(this.data, 'data.weaponType') === 'simpleR' && (+getProperty(this.data, 'data.weight') < 0.5)) return true;
    if (this.type === 'consumable' && (this.name === 'Caltrops' || this.name === 'Ball Bearings')) return true;
    return false;
  };

  game.dnd5e.entities.Item5e.prototype.invlim_getInitUpdate = function (defaultLocation) {
    const stackable = this.getFlag('inventory-limiter', 'stackable');
    const isStackableFlagSet = stackable === true || stackable === false;
    const location = this.getFlag('inventory-limiter', 'location');
    const isLocationFlagSet = !!location;

    if (isStackableFlagSet && isLocationFlagSet) return null;

    const update = {
      _id: this.id,
      flags: {
        'inventory-limiter': {},
      }
    };

    if (!isStackableFlagSet) {
      update.flags['inventory-limiter'].stackable = this.invlim_canStack();
    }

    if (!isLocationFlagSet) {
      update.flags['inventory-limiter'].location = defaultLocation;
    }

    return update;
  };

  game.dnd5e.entities.Item5e.prototype.invlim_setStackable = function (value) {
    return this.setFlag('inventory-limiter', 'stackable', !!value);
  };

  game.dnd5e.entities.Item5e.prototype.invlim_isStackable = function () {
    return !!this.getFlag('inventory-limiter', 'stackable');
  };
}

export function initItemSheet() {
  console.log('inventory-limiter | Item sheet setup.');

  if (!libWrapper) {
    console.error('inventory-limiter | LibWrapper not available, Item sheet setup not possible.')
    return;
  }

  libWrapper.register('inventory-limiter', 'game.dnd5e.applications.ItemSheet5e.prototype._renderInner', async function (_renderInner, data, options) {
    let $html = await _renderInner(data, options);
    $html = this.invlim_addStackableCheckbox($html, data);
    return $html;
  }, 'WRAPPER');

  game.dnd5e.applications.ItemSheet5e.prototype.invlim_addStackableCheckbox = function ($html, data) {
    if (!data.isPhysical) return $html;

    const itemDescriptionFlags = $html.find('.tab[data-tab="description"] .item-properties');
    itemDescriptionFlags.prepend(
      '<div class="form-group">' +
          '<label>Stackable</label>' +
          '<input type="checkbox" class="item-change-stackable" name="invlim-isStackable"' +
            (!!data.item.flags['inventory-limiter'].stackable ? ' checked' : '')
          +' />' +
      '</div>'
    );

    return $html;
  };

  libWrapper.register('inventory-limiter', 'game.dnd5e.applications.ItemSheet5e.prototype.activateListeners', function (activateListeners, html) {
    const result = activateListeners(html);
    html.find('.item-change-stackable').click(this.invlim_onChangeStackable.bind(this));
    return result;
  }, 'WRAPPER');

  game.dnd5e.applications.ItemSheet5e.prototype.invlim_onChangeStackable = function (event) {
    event.preventDefault();
    const checked = $(event.target).attr('checked');
    this.object.invlim_setStackable(!checked);
  };
}