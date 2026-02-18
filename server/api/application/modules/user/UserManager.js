const crypto = require('crypto');
const CONFIG = require('../../../config.js')

class UserManager {
    constructor({ mediator, db }) { 
        this.db = db;
        this.mediator = mediator;

        const events = mediator.getEventTypes();
        const triggers = mediator.getTriggerTypes();

        // Подписка на ивенты
        mediator.subscribe(events.LOGOUT, this.logout.bind(this));
        mediator.subscribe(events.REGISTRATION, this.registration.bind(this));
        mediator.subscribe(events.DELETE_USER, this.deleteUser.bind(this));

        // Устанавливаем обработчики для триггеров
        mediator.set(triggers.LOGIN, this.login.bind(this));
        mediator.set(triggers.GET_RATING_TABLE, this.getRatingTable.bind(this));
        mediator.set(triggers.GET_USER_INFO, this.getUserInfo.bind(this));
    }

    async login(params) {
        try {
            const { login, passwordHash } = params;
            
            // Валидация
            if (!login || !passwordHash) {
                return { error: 242 };
            }

            // Получение пользователя по логину
            const user = await this.db.getUserByLogin(login);
            if (!user) {
                return { error: 1005 };
            }

            // Проверка пароля
            if (passwordHash !== user.password) {
                return { error: 1002 };
            }

            // Генерация токена
            const token = crypto.createHash('md5').update(Math.random().toString()).digest('hex');
            
            // Сохранение токена
            await this.db.updateToken(user.id, token);

            return {
                id: user.id,
                nickname: user.nickname,
                token: token
            };
        } catch (e) {
            return { error: 9000 };
        }
    }

    async logout(params) {
        try {
            const { token } = params;

            if (!token) {
                return { error: 242 };
            }

            // Получение пользователя по токену
            const user = await this.db.getUserByToken(token);
            if (!user) {
                return { error: 705 };
            }

            // Обнуление токена
            await this.db.updateToken(user.id, null);
            return true;
        } catch (e) {
            return { error: 9000 };
        }
    }

    async registration(params) {
        try {
            const { login, passwordHash, nickname } = params;

            if (!login || !passwordHash || !nickname) {
                return { error: 242 };
            }

            // Проверка существования пользователя с таким логином
            const existingUser = await this.db.getUserByLogin(login);
            if (existingUser) {
                return { error: 1006 };
            }

            // Регистрация нового пользователя
            await this.db.registration(login, passwordHash, nickname);
            
            // Получение только что созданного пользователя
            const newUser = await this.db.getUserByLogin(login);
            if (!newUser) {
                return { error: 705 };
            }

            // Создание персонажа
            const characterCreated = await this.db.createCharacter(newUser.id);
            if (!characterCreated) {
                return { error: 1007 };
            }

            // Получение персонажа для добавления предметов и класса
            const character = await this.db.getCharacterByUserId(newUser.id);
            if (!character) {
                return { error: 706 };
            }

            // ============ ДОБАВЛЕНИЕ СТАРТОВОГО КЛАССА ============
            const classAdded = await this.db.addUserPersonClass(newUser.id, CONFIG.STARTED_CLASS_ID);
            if (!classAdded) {
                return { error: 1008 };
            }

            // Выбор стартового класса
            const classSelected = await this.db.setUserSelectedPersonClass(newUser.id, CONFIG.STARTED_CLASS_ID);
            if (!classSelected) {
                return { error: 1009 };
            }

            // ============ ДОБАВЛЕНИЕ СТАРТОВОГО ШМОТА ============
            for (const itemId of CONFIG.STARTED_ITEMS) {
                // Получаем информацию о предмете
                const item = await this.db.getItemById(itemId);
                if (!item) continue;

                // Проверяем, есть ли уже такой предмет у персонажа
                const existingItem = await this.db.getUserItem(character.id, itemId);
                
                if (existingItem) {
                    // Если предмет уже есть (для расходников), увеличиваем количество
                    if (item.itemType === 'arrow' || item.itemType === 'potion') {
                        const newQuantity = existingItem.quantity + 1;
                        await this.db.updateUserItemQuantity(character.id, itemId, newQuantity);
                    }
                } else {
                    // Если предмета нет, добавляем
                    await this.db.addUserItem(character.id, itemId);
                }
            }
            // =======================================================

            // Авто логин после регистрации
            return this.login({ login, passwordHash });
        } catch (e) {
            return { error: 9000 };
        }
    }

    async getUserInfo(params) {
        try {
            const { token } = params;

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

            // Получение информации о классах и предметах
            const selectedClass = await this.db.getUserSelectedClassId(user.id);
            const purchasedClasses = await this.db.getUserPurchasedClassIds(user.id);
            const purchasedItems = await this.db.getUserPurchasedItemsWithQuantity(character.id);

            return {
                characterId: character.id,
                userId: user.id,
                login: user.login,
                nickname: user.nickname,
                money: character.money,
                selectedClass: selectedClass,
                purchasedClasses: purchasedClasses,
                purchasedItems: purchasedItems
            };
        } catch (e) {
            return { error: 9000 };
        }
    }

    async deleteUser(params) {
        try {
            const { token } = params;

            if (!token) {
                return { error: 242 };
            }

            // Получение пользователя по токену
            const user = await this.db.getUserByToken(token);
            if (!user) {
                return { error: 705 };
            }

            // Удаление персонажа и связанных данных
            const character = await this.db.getCharacterByUserId(user.id);
            if (character) {
                await this.db.deleteAllCharacterItems(character.id);
                await this.db.deleteAllCharacterClasses(character.id);
                await this.db.deleteCharacter(user.id);
            }

            // Удаление сообщений пользователя
            await this.db.deleteUserMessages(user.id);
            
            // Удаление пользователя из БД
            const success = await this.db.deleteUser(user.id);

            return success ? true : { error: 2012 };
        } catch (e) {
            return { error: 9000 };
        }
    }

    async getRatingTable(params) {
        try {
            const { token } = params;

            if (!token) {
                return { error: 242 };
            }

            // Получение пользователя по токену
            const user = await this.db.getUserByToken(token);
            if (!user) {
                return { error: 705 };
            }

            // Получение таблицы рейтинга
            return await this.db.getRatingTable();
        } catch (e) {
            return { error: 9000 };
        }
    }
}

module.exports = UserManager;