# TPoaJ - Inventory Limiter
FoundryVTT D&amp;D5e module for limiting inventory size.

Custom inventory rules for the TPoaJ D&D campaign.

## Features
- Soft limit on character's inventory size
  - Show reminder when exceeding the limit
- Separate storages in inventory view in the character sheet
  - Carried items
  - Backpack / Sack
  - Bag of Holding
  - Item storage
- Automatically unequip items that are moved away from the inventory
- Automatically un-attune items that are moved to item storage
- Disadvantage for stealth rolls if character is wearing a backpack
  - Disadvantage added to automatic rolls
  - Reminder alert
  - Indicator in skill list
  - **Unequipping the backpack removes indicator and alert**
- Weightless items are not counted in the carried items
- Item quantity is considered when calculating carried items
- Items can be marked as Stackable in the item sheet
  - Setting an item as stackable makes it count as 1 carried item regardless of quantity
  - Items set as stackable by default:
    - Ammo bundles (e.g. Arrows)
    - Darts (and other mini ranged weapons)
    - Caltrops and Ball bearings

## Configurable settings
- **Character's carry limit**: amount of items a PC can carry without using a backpack
- **Add ability modifier**: select an ability and increase carry limit by its modifier
- **Backpack capacity**: amount of additional items the PC can carry when they use a backpack
- **Bag of Holding capacity**: amount of additional items the PC can carry with a bag of holding
