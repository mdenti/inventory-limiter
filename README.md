# TPoaJ - Inventory Limiter
FoundryVTT D&amp;D5e module for limiting inventory size.

Custom inventory rules for the TPoaJ D&D campaign.

## Features
- Soft limit on character's inventory size
- New item storage for storing non-carried items
- Move items from inventory to storage, and from storage to inventory
- Automatically unequip stored items
- Disadvantage added to automatic stealth rolls if character is wearing a backpack
- Reminder message in chat about stealth roll rule if character is wearing a backpack

- Weightless items are not counted in the carried items
- Item quantity is considered when calculating carried items
- Ammo bundles (e.g. Arrows) with quantity > 1 are counted as a single carried item

## Configurable settings
- **Character's carry limit**: amount of items a PC can carry without using a backpack
- **Add ability modifier**: select an ability and increase carry limit by its modifier
- **Backpack capacity**: amount of additional items the PC can carry when they use a backpack
- **Bag of Holding capacity**: amount of additional items the PC can carry with a bag of holding
