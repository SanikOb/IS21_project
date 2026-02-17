const crypto = require('crypto');

class BaseHandler {
    constructor(db) {
        this.db = db;
    }

    // Проверка пользователя по токену
    async checkUserByToken(token) {
        const user = await this.db.getUserByToken(token);
        if (!user) {
            return { error: 705 };
        }
        return user;
    }
    
    // Проверка существования пользователя по ID
    async checkUserExists(userId) {
        const user = await this.db.getUserById(userId);
        if (!user) {
            return { error: 705 };
        }
        return user;
    }

    // Проверка существования персонажа у пользователя
    async checkCharacterExists(userId) {
        const character = await this.db.getCharacterByUserId(userId);
        if (!character) {
            return { error: 706 };
        }
        return character;
    }

    // Проверка, что пользователь является владельцем комнаты
    async checkUserIsRoomOwner(userId) {
        const roomMember = await this.db.getRoomMemberByUserId(userId);
        
        // Проверка, что пользователь в комнате и является владельцем
        if (!roomMember) {
            return { error: 2006 };
        }
        
        if (roomMember.type !== 'owner') {
            return { error: 2010 };
        }
        
        return roomMember;
    }

    // Проверка, что комната имеет статус "started"
    async checkRoomIsStarted(roomId) {
        const room = await this.db.getRoomById(roomId);
        
        // Проверка существования комнаты и её статуса
        if (!room) {
            return { error: 2003 };
        }
        
        if (room.status !== 'started') {
            return { error: 2011 };
        }
        
        return room;
    }

    // Проверка, что пользователь находится в комнате
    async checkUserInRoom(userId) {
        const roomMember = await this.db.getRoomMemberByUserId(userId);
        
        if (!roomMember) {
            return { error: 2006 };
        }
        
        return roomMember;
    }
    
    // Получение комнаты по ID участника
    async getRoomByMember(roomMember) {
        const room = await this.db.getRoomById(roomMember.roomId);
        if (!room) {
            return { error: 2003 };
        }
        return room;
    }

    async useArrow(characterId) {
        // получаем запись о расходнике
        const consumable = await this.db.getCharacterConsumable(characterId, "arrow");
        if (!consumable) return false;
        
        // обрабатываем в зависимости от количества
        if (consumable.quantity > 1) {
            // уменьшаем количество на 1
            const newQuantity = consumable.quantity - 1;
            await this.db.updateUserItemQuantity(characterId, consumable.itemId, newQuantity);
        } else {
            // последний предмет - удаляем
            await this.db.deleteUserItem(characterId, consumable.itemId);
        }
        return true;
    }

    async usePotion(characterId) {
        // получаем запись о расходнике
        const consumable = await this.db.getCharacterConsumable(characterId, "potion");
        if (!consumable) return false;
        
        // обрабатываем в зависимости от количества
        if (consumable.quantity > 1) {
            // уменьшаем количество на 1
            const newQuantity = consumable.quantity - 1;
            await this.db.updateUserItemQuantity(characterId, consumable.itemId, newQuantity);
        } else {
            // последний предмет - удаляем
            await this.db.deleteUserItem(characterId, consumable.itemId);
        }
        return true;
    }

    async isUserPlaying(userId) {
        return await this.db.isUserPlaying(userId);
    }

    async leaveParticipantFromRoom(userId) {
        return await this.db.leaveParticipantFromRoom(userId);
    }

    // Генерация MD5 хеша
    md5(input) {
        return crypto.createHash('md5').update(String(input)).digest('hex');
    }
}

module.exports = BaseHandler;