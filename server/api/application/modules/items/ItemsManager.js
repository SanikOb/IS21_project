const CONFIG = require('../../../config.js');

class ItemsManager {
    constructor({ mediator, db }) {
        this.db = db;
        this.mediator = mediator;

        // Получение типов ивентов и триггеров из медиатора
        const events = mediator.getEventTypes();
        const triggers = mediator.getTriggerTypes();

        // Подписка на ивенты
        mediator.subscribe(events.BUY_ITEM, this.buyItem.bind(this));
        mediator.subscribe(events.SELL_ITEM, this.sellItem.bind(this));
        mediator.subscribe(events.APPLY_ARROW, this.applyArrow.bind(this));
        mediator.subscribe(events.APPLY_POTION, this.applyPotion.bind(this));
        
        // Устанавливаем обработчики для триггеров
        mediator.set(triggers.GET_ITEMS_DATA, this.getItemsData.bind(this));
    }

    async buyItem(params) {
        try {
            const { token, itemId } = params;

            // Валидация
            if (!token || !itemId) {
                return { error: 242 };
            }

            // Получение пользователя по токену
            const user = await this.db.getUserByToken(token);
            if (!user) {
                return { error: 705 };
            }

            // Получение персонажа
            const character = await this.db.getCharacterByUserId(user.id);
            if (!character) {
                return { error: 706 };
            }

            // проверка, существует ли предмет
            const item = await this.db.getItemById(itemId);
            if (!item) {
                return { error: 4001 };
            }

            // проверка, есть ли у персонажа деньги
            if (character.money < item.cost) {
                return { error: 4002 };
            }

            // проверка, есть ли у персонажа предмет такого же типа
            const existingItemType = await this.db.hasCharacterItemType(character.id, item.itemType);
            
            if (existingItemType) {
                switch (item.itemType) {
                    // для зелей и стрел проверяем только ограничение по количеству (для зелей макс. = 3, для стрел макс. = 50)
                    case "potion":
                        if (existingItemType.quantity >= CONFIG.MAX_POTIONS_PER_USER) {
                            return { error: 4005 };
                        }
                        break;
                    case "arrow":
                        if (existingItemType.quantity >= CONFIG.MAX_ARROWS_PER_USER) {
                            return { error: 4005 };
                        }
                        break;
                    // для остальных типов предметов - нельзя иметь больше одного предмета данного типа
                    default:
                        return { error: 4003 };
                }
            }

            // начинаем транзакцию
            const connection = await this.db.beginTransaction();
            try {
                // списываем деньги
                const moneyUpdated = await this.db.updateCharacterMoneySubtract(character.id, item.cost);
                if (!moneyUpdated) {
                    await this.db.rollback(connection);
                    return { error: 4004 };
                }

                // если это зелье или стрела, то увеличиваем количество
                if (existingItemType && ["arrow", "potion"].includes(item.itemType)) {
                    const newQuantity = existingItemType.quantity + 1;
                    const itemUpdated = await this.db.updateUserItemQuantity(
                        character.id, existingItemType.itemId, newQuantity
                    );
                    if (!itemUpdated) {
                        await this.db.rollback(connection);
                        return { error: 4004 };
                    }
                } else {
                    // добавляем новый предмет в инвентарь
                    const itemAdded = await this.db.addUserItem(character.id, itemId);
                    if (!itemAdded) {
                        await this.db.rollback(connection);
                        return { error: 4004 };
                    }
                }

                await this.db.commit(connection);
                return true;
            } catch (e) {
                await this.db.rollback(connection);
                return { error: 4004 };
            }
        } catch (e) {
            return { error: 9000 };
        }
    }

    async sellItem(params) {
        try {
            const { token, itemId } = params;

            // Валидация
            if (!token || !itemId) {
                return { error: 242 };
            }

            // Получение пользователя по токену
            const user = await this.db.getUserByToken(token);
            if (!user) {
                return { error: 705 };
            }

            // Получение персонажа
            const character = await this.db.getCharacterByUserId(user.id);
            if (!character) {
                return { error: 706 };
            }

            // проверка, существует ли предмет
            const item = await this.db.getItemById(itemId);
            if (!item) {
                return { error: 4001 };
            }

            // проверка, есть ли предмет в инвентаре
            const userItem = await this.db.getUserItem(character.id, item.id);
            if (!userItem) {
                return { error: 4006 };
            }

            const sellPrice = Math.round(item.cost);

            // начинаем транзакцию
            const connection = await this.db.beginTransaction();
            try {
                // уменьшаем количество расходников или удаляем предмет
                if (['potion', 'arrow'].includes(item.itemType) && userItem.quantity > 1) {
                    // уменьшяем количество расходников
                    const itemUpdated = await this.db.updateUserItemQuantity(
                        character.id, itemId, userItem.quantity - 1
                    );
                    if (!itemUpdated) {
                        await this.db.rollback(connection);
                        return { error: 4007 };
                    }
                } else {
                    // удаляем предмет
                    const itemDeleted = await this.db.deleteUserItem(character.id, itemId);
                    if (!itemDeleted) {
                        await this.db.rollback(connection);
                        return { error: 4007 };
                    }
                }

                // записываем деньги
                const moneyUpdated = await this.db.updateCharacterMoneyAdd(character.id, sellPrice);
                if (!moneyUpdated) {
                    await this.db.rollback(connection);
                    return { error: 4007 };
                }

                await this.db.commit(connection);
                return true;
            } catch (e) {
                await this.db.rollback(connection);
                return { error: 4007 };
            }
        } catch (e) {
            return { error: 9000 };
        }
    }

    async applyArrow(params) {
        try {
            const { token } = params;

            // Валидация
            if (!token) {
                return { error: 242 };
            }

            // Получение пользователя по токену
            const user = await this.db.getUserByToken(token);
            if (!user) {
                return { error: 705 };
            }

            // Получение персонажа
            const character = await this.db.getCharacterByUserId(user.id);
            if (!character) {
                return { error: 706 };
            }

            // проверка наличия лука
            const hasBow = await this.db.hasCharacterWeaponType(character.id, 'bow');
            if (!hasBow) {
                return { error: 4008 };
            }

            // проверка наличия стрел
            const hasArrows = await this.db.hasCharacterArrows(character.id);
            if (!hasArrows) {
                return { error: 4009 };
            }

            // получаем запись о расходнике
            const consumable = await this.db.getCharacterConsumable(character.id, "arrow");
            
            // обрабатываем в зависимости от количества
            if (consumable.quantity > 1) {
                // уменьшаем количество на 1
                const newQuantity = consumable.quantity - 1;
                await this.db.updateUserItemQuantity(character.id, consumable.itemId, newQuantity);
            } else {
                // последний предмет - удаляем
                await this.db.deleteUserItem(character.id, consumable.itemId);
            }
            
            return true;
        } catch (e) {
            return { error: 9000 };
        }
    }

    async applyPotion(params) {
        try {
            const { token } = params;

            // Валидация
            if (!token) {
                return { error: 242 };
            }

            // Получение пользователя по токену
            const user = await this.db.getUserByToken(token);
            if (!user) {
                return { error: 705 };
            }

            // Получение персонажа
            const character = await this.db.getCharacterByUserId(user.id);
            if (!character) {
                return { error: 706 };
            }

            // проверка наличия зелий
            const hasPotion = await this.db.hasCharacterPotion(character.id);
            if (!hasPotion) {
                return { error: 4010 };
            }

            // получаем запись о расходнике
            const consumable = await this.db.getCharacterConsumable(character.id, "potion");
            
            // обрабатываем в зависимости от количества
            if (consumable.quantity > 1) {
                // уменьшаем количество на 1
                const newQuantity = consumable.quantity - 1;
                await this.db.updateUserItemQuantity(character.id, consumable.itemId, newQuantity);
            } else {
                // последний предмет - удаляем
                await this.db.deleteUserItem(character.id, consumable.itemId);
            }
            
            return true;
        } catch (e) {
            return { error: 9000 };
        }
    }

    async getItemsData(params) {
        try {
            const { token } = params;

            // Валидация
            if (!token) {
                return { error: 242 };
            }

            // Получение пользователя по токену (для проверки существования)
            const user = await this.db.getUserByToken(token);
            if (!user) {
                return { error: 705 };
            }

            // Возвращаем данные о предметах
            return await this.db.getAllItemsData();
        } catch (e) {
            return { error: 9000 };
        }
    }
}

module.exports = ItemsManager;