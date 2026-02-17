const mysql = require('mysql2/promise');
const CONFIG = require('../../../config.js');

class DB {
    constructor() {
        this.pool = mysql.createPool({
            host: CONFIG.DB_HOST,
            port: CONFIG.DB_PORT,
            user: CONFIG.DB_USER,
            password: CONFIG.DB_PASS,
            database: CONFIG.DB_NAME,
            charset: CONFIG.DB_CHARSET,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
    }

    async execute(sql, params = []) {
        const [result] = await this.pool.execute(sql, params);
        return result;
    }

    async query(sql, params = []) {
        const [rows] = await this.pool.execute(sql, params);
        return rows[0] || null;
    }

    async queryAll(sql, params = []) {
        const [rows] = await this.pool.execute(sql, params);
        return rows;
    }

    // ============ USER METHODS ============
    async getUserByLogin(login) {
        return await this.query("SELECT * FROM users WHERE login=?", [login]);
    }

    async getUserByToken(token) {
        return await this.query("SELECT * FROM users WHERE token=?", [token]);
    }

    async getUserById(id) {
        return await this.query("SELECT * FROM users WHERE id = ?", [id]);
    }

    async updateToken(userId, token) {
        await this.execute("UPDATE users SET token=? WHERE id=?", [token, userId]);
    }

    async registration(login, password, nickname) {
        await this.execute(
            "INSERT INTO users (login, password, nickname) VALUES (?, ?, ?)",
            [login, password, nickname]
        );
    }

    async getRatingTable() {
        return await this.queryAll(`
            SELECT 
                u.nickname,
                c.rating
            FROM characters c
            JOIN users u ON c.user_id = u.id
            WHERE c.rating > 0
            ORDER BY c.rating DESC
            LIMIT 20
        `);
    }

    // ============ CHARACTER METHODS ============
    async getCharacterByUserId(userId) {
        return await this.query("SELECT * FROM characters WHERE user_id = ?", [userId]);
    }

    async createCharacter(userId) {
        const result = await this.execute(
            "INSERT INTO characters (user_id, hp, defense, money) VALUES (?, 100, 0, 1000)",
            [userId]
        );
        return result.affectedRows > 0;
    }

    async deleteCharacter(userId) {
        const result = await this.execute("DELETE FROM characters WHERE user_id = ?", [userId]);
        return result.affectedRows > 0;
    }

    async updateCharacterMoneyAdd(characterId, amount) {
        const result = await this.execute("UPDATE characters SET money = money + ? WHERE id = ?", [amount, characterId]);
        return result.affectedRows > 0;
    }

    async updateCharacterMoneySubtract(characterId, amount) {
        const result = await this.execute("UPDATE characters SET money = money - ? WHERE id = ?", [amount, characterId]);
        return result.affectedRows > 0;
    }

    // ============ LOBBY METHODS (нужны для deleteUser) ============
    async getUserTypeInRoom(userId) {
        const character = await this.getCharacterByUserId(userId);
        if (!character) return null;
    
        const result = await this.query(
            "SELECT type FROM room_members WHERE character_id=?",
            [character.id]
        );
        return result ? result.type : null;
    }

    // ============ LOBBY METHODS ============

    // Получение информации об участнике комнаты по ID пользователя
    async getRoomMemberByUserId(userId) {
        const character = await this.getCharacterByUserId(userId);
        if (!character) return null;
        
        return await this.query(
            "SELECT id, room_id as roomId, character_id as characterId, type, status, data FROM room_members WHERE character_id=?", 
            [character.id]
        );
    }

    // Удаление всех участников комнаты
    async deleteAllRoomMembers(roomId) {
        const result = await this.execute(
            "DELETE FROM room_members WHERE room_id=?", 
            [roomId]
        );
        return result.affectedRows > 0;
    }

    // Удаление комнаты
    async deleteRoom(roomId) {
        const result = await this.execute(
            "DELETE FROM rooms WHERE id=?", 
            [roomId]
        );
        return result.affectedRows > 0;
    }

    // Удаление всех ботов для комнаты
    async deleteAllBotsForRoom(roomId) {
        const result = await this.execute(
            "DELETE FROM bots_rooms WHERE room_id = ?", 
            [roomId]
        );
        return result.affectedRows > 0;
    }

    // Удаление всех стрел для комнаты
    async deleteAllArrowsForRoom(roomId) {
        const result = await this.execute(
            "DELETE FROM arrows WHERE room_id = ?", 
            [roomId]
        );
        return result.affectedRows > 0;
    }

    // Проверка, находится ли пользователь в игре
    async isUserPlaying(userId) {
        const character = await this.getCharacterByUserId(userId);
        if (!character) return false;
        
        const result = await this.query(
            "SELECT id FROM room_members WHERE character_id = ? AND status = 'started'", 
            [character.id]
        );
        return result !== null;
    }

    // Выход участника из комнаты
    async leaveParticipantFromRoom(userId) {
        const character = await this.getCharacterByUserId(userId);
        if (!character) return false;
        
        await this.execute(
            "DELETE FROM room_members WHERE character_id=?", 
            [character.id]
        );
        return true;
    }

    // Создание новой комнаты
    async createRoom(userId, roomName, roomSize) {
        const character = await this.getCharacterByUserId(userId);
        if (!character) return false;

        const result = await this.execute(
            "INSERT INTO rooms (name, room_size) VALUES (?, ?)", 
            [roomName, roomSize]
        );

        if (result.insertId) {
            await this.execute(
                "INSERT INTO room_members (room_id, character_id, type, status) VALUES (?, ?, ?, ?)",
                [result.insertId, character.id, 'owner', 'ready']
            );
            return true;
        }

        return false;
    }

    // Добавление участника в комнату
    async addRoomMember(roomId, characterId, type, status = 'ready') {
        await this.execute(
            "INSERT INTO room_members (room_id, character_id, type, status) VALUES (?, ?, ?, ?)",
            [roomId, characterId, type, status]
        );
    }

    // Обновление статуса комнаты
    async updateRoomStatus(roomId, status) {
        await this.execute(
            "UPDATE rooms SET status=? WHERE id=?", 
            [status, roomId]
        );
    }

    // Обновление статуса всех участников комнаты
    async updateAllRoomMembersStatus(roomId, status) {
        await this.execute(
            "UPDATE room_members SET status=? WHERE room_id=?", 
            [status, roomId]
        );
    }

    // Создание начальных записей для ботов в комнате
    async createInitialBotsForRoom(roomId) {
        const botsData = await this.getAllBotsData();
        await this.execute(
            "INSERT INTO bots_rooms (room_id, data) VALUES (?, ?)",
            [roomId, JSON.stringify(botsData)]
    );
}

    // Создание начальных записей для стрел в комнате
    async createInitialArrowsForRoom(roomId) {
        await this.execute(
            "INSERT INTO arrows (room_id, data) VALUES (?, ?)",
            [roomId, JSON.stringify([])]
        );
    }

    // Обновление хеша комнаты
    async updateRoomHash(hash) {
        await this.execute(
            "UPDATE hashes SET room_hash = ? WHERE id = 1",
            [hash]
        );
    }

    // Получение всех участников комнаты
    async getAllRoomMembers(roomId) {
        return await this.queryAll(
            "SELECT * FROM room_members WHERE room_id=?", 
            [roomId]
        );
    }

    // Получение комнаты по ID
    async getRoomById(roomId) {
        return await this.query("SELECT id, status, name, room_size as roomSize FROM rooms WHERE id=?", [roomId]);
    }

    // Получение хеша комнаты
    async getRoomHash() {
        const result = await this.query("SELECT room_hash FROM hashes WHERE id = 1");
        return result ? result.room_hash : null;
    }

    // Получение всех открытых и закрытых комнат с количеством игроков
    async getOpenAndClosedRooms() {
        return await this.queryAll(`
            SELECT r.id, r.name, r.status, r.room_size as roomSize, COUNT(rm.character_id) as playersCount 
            FROM rooms r 
            LEFT JOIN room_members rm ON r.id = rm.room_id 
            WHERE r.status IN ('open', 'closed') 
            GROUP BY r.id, r.name, r.status, r.room_size
        `);
    }

    // Получение всех участников комнаты с информацией о пользователях
    async getAllRoomMembersWithUserInfo(roomId) {
        return await this.queryAll(`
            SELECT 
                rm.character_id as characterId,
                rm.type,
                rm.status,
                u.id as userId,
                u.login,
                u.nickname,
                c.money,
                u.token
            FROM room_members rm 
            JOIN characters c ON rm.character_id = c.id 
            JOIN users u ON c.user_id = u.id 
            WHERE rm.room_id = ?
        `, [roomId]);
    }

    // Обновление имени комнаты
    async updateRoomName(roomId, newRoomName) {
        const result = await this.execute("UPDATE rooms SET name = ? WHERE id = ?", [newRoomName, roomId]);
        return result.affectedRows > 0;
    }

    // Получение рейтинга участника комнаты
    async getRoomMemberRating(roomMemberId) {
        const result = await this.query(
            "SELECT rating FROM room_members WHERE id = ?",
            [roomMemberId]
        );
        return result ? result.rating : 0;
    }

    // Добавление рейтинга участнику комнаты
    async addRatingToRoomMember(roomMemberId, ratingPoints) {
        const result = await this.execute(
            "UPDATE room_members SET rating = rating + ? WHERE id = ?",
            [ratingPoints, roomMemberId]
        );
        return result.affectedRows > 0;
    }

    // Вычитание рейтинга у участника комнаты
    async substractRatingFromRoomMember(roomMemberId, ratingPoints) {
        const result = await this.execute(
            "UPDATE room_members SET rating = rating - ? WHERE id = ?",
            [ratingPoints, roomMemberId]
        );
        return result.affectedRows > 0;
    }

    // Добавление рейтинга персонажу
    async addRatingToCharacter(characterId, ratingPoints) {
        const result = await this.execute(
            "UPDATE characters SET rating = rating + ? WHERE id = ?",
            [ratingPoints, characterId]
        );
        return result.affectedRows > 0;
    }

    // ============ GAME METHODS ============

    // Получение всех участников комнаты с данными
    async getAllRoomMembersWithData(roomId) {
        return await this.queryAll(`
            SELECT 
                rm.id,
                rm.character_id as characterId,
                rm.type,
                rm.status,
                rm.data as characterData,
                rm.rating,
                u.id as userId,
                u.nickname,
                c.money,
                u.token
            FROM room_members rm 
            JOIN characters c ON rm.character_id = c.id 
            JOIN users u ON c.user_id = u.id 
            WHERE rm.room_id = ?
        `, [roomId]);
    }

    // Обновление данных всех ботов в комнате
    async updateAllBotsInRoom(roomId, botsData) {
        const result = await this.execute(
            "UPDATE bots_rooms SET data = ? WHERE room_id = ?",
            [botsData, roomId]
        );
        return result.affectedRows > 0;
    }

    // Обновление данных всех стрел в комнате
    async updateAllArrowsInRoom(roomId, arrowsData) {
        const result = await this.execute(
            "UPDATE arrows SET data = ? WHERE room_id = ?",
            [arrowsData, roomId]
        );
        return result.affectedRows > 0;
    }

    // Обновление данных участника комнаты
    async updateRoomMemberData(roomMemberId, data) {
        const result = await this.execute(
            "UPDATE room_members SET data = ? WHERE id = ?",
            [data, roomMemberId]
        );
        return result.affectedRows > 0;
    }

    // Получение данных ботов по ID комнаты
    async getBotsByRoomId(roomId) {
        const result = await this.query(
            "SELECT data FROM bots_rooms WHERE room_id = ?",
            [roomId]
        );
        return result ? result.data : null;
    }

    // Получение данных стрел по ID комнаты
    async getArrowsByRoomId(roomId) {
        const result = await this.query(
            "SELECT data FROM arrows WHERE room_id = ?",
            [roomId]
        );
        return result ? result.data : null;
    }

    // Получение всех данных о ботах из таблицы bots
    async getAllBotsData() {
        return await this.queryAll(`
            SELECT 
                id,
                name,
                hp,
                damage,
                attack_speed as attackSpeed,
                attack_distance as attackDistance,
                money
            FROM bots
        `);
    }

    // Получение типа бота по ID
    async getBotTypeById(botTypeId) {
        return await this.query("SELECT * FROM bots WHERE id = ?", [botTypeId]);
    }

    // ============ HASH METHODS ============

    // Получение всех хешей сцены
    async getAllSceneHashes() {
        const result = await this.query("SELECT character_hash as characterHash, bot_hash as botHash, arrow_hash as arrowHash FROM hashes WHERE id = 1");
        return result;
    }

    // Обновление хеша персонажей
    async updateCharacterHash(hash) {
        await this.execute("UPDATE hashes SET character_hash = ? WHERE id = 1", [hash]);
    }

    // Обновление хеша ботов
    async updateBotHash(hash) {
        await this.execute("UPDATE hashes SET bot_hash = ? WHERE id = 1", [hash]);
    }

    // Обновление хеша стрел
    async updateArrowHash(hash) {
        await this.execute("UPDATE hashes SET arrow_hash = ? WHERE id = 1", [hash]);
    }

    // ============ MESSAGE METHODS ============
    async deleteUserMessages(userId) {
        const result = await this.execute("DELETE FROM messages WHERE user_id = ?", [userId]);
        return result.affectedRows > 0;
    }

    // ============ CLASS METHODS ============
    async getUserSelectedClassId(userId) {
        const character = await this.getCharacterByUserId(userId);
        if (!character) return null;

        const result = await this.query(
            "SELECT class_id FROM characters_classes WHERE character_id = ? AND selected = 1",
            [character.id]
        );

        return result ? result.class_id : null;
    }

    async getUserPurchasedClassIds(userId) {
        const character = await this.getCharacterByUserId(userId);
        if (!character) return [];

        const results = await this.queryAll(
            "SELECT class_id FROM characters_classes WHERE character_id = ?",
            [character.id]
        );

        return results.map(row => parseInt(row.class_id));
    }

    async addUserPersonClass(userId, classId) {
        const character = await this.getCharacterByUserId(userId);
        if (!character) return false;

        const result = await this.execute(
            "INSERT INTO characters_classes (character_id, class_id, selected) VALUES (?, ?, 0)",
            [character.id, classId]
        );
        return result.affectedRows > 0;
    }

    async setUserSelectedPersonClass(userId, classId) {
        const character = await this.getCharacterByUserId(userId);
        if (!character) return false;

        const result = await this.execute(
            "UPDATE characters_classes SET selected = 1 WHERE character_id = ? AND class_id = ?",
            [character.id, classId]
        );
        return result.affectedRows > 0;
    }

    // ============ ITEM METHODS ============
    async getItemById(itemId) {
        const result = await this.query(
            `SELECT 
                id, 
                name, 
                item_type as itemType,
                weapon_type as weaponType,
                damage,
                attack_speed as attackSpeed,
                attack_distance as attackDistance,
                bonus_defense as bonusDefense,
                bonus_hp as bonusHp,
                cost
            FROM items 
            WHERE id = ?`,
            [itemId]
        );
        return result;
    }

    async getUserItem(characterId, itemId) {
        return await this.query(
            "SELECT * FROM character_items WHERE character_id=? AND item_id=?",
            [characterId, itemId]
        );
    }

    async getUserPurchasedItemsWithQuantity(characterId) {
        const results = await this.queryAll(
            "SELECT item_id as itemId, quantity FROM character_items WHERE character_id = ?",
            [characterId]
        );

        return results.map(row => ({
            itemId: parseInt(row.itemId),
            quantity: parseInt(row.quantity)
        }));
    }

    async addUserItem(characterId, itemId) {
        const result = await this.execute(
            "INSERT INTO character_items (character_id, item_id, quantity) VALUES (?, ?, 1)",
            [characterId, itemId]
        );
        return result.affectedRows > 0;
    }

    async hasCharacterWeaponType(characterId, weaponType) {
        const result = await this.query(
            `SELECT ci.* FROM character_items ci 
            JOIN items i ON ci.item_id = i.id 
            WHERE ci.character_id = ? AND i.weapon_type = ?`,
            [characterId, weaponType]
        );
        return result;
    }

    async hasCharacterItemType(characterId, itemType) {
        const result = await this.query(
            `SELECT 
                ci.id, 
                ci.item_id as itemId, 
                ci.character_id as characterId, 
                ci.quantity, 
                i.item_type as itemType, 
                i.weapon_type as weaponType
            FROM character_items ci 
            JOIN items i ON ci.item_id = i.id 
            WHERE ci.character_id = ? AND i.item_type = ?`,
            [characterId, itemType]
        );
        return result;
    }

    async hasCharacterArrows(characterId) {
        const arrowItem = await this.query(
            `SELECT ci.* FROM character_items ci 
            JOIN items i ON ci.item_id = i.id 
            WHERE ci.character_id = ? AND i.item_type = 'arrow' AND ci.quantity > 0`,
            [characterId]
        );
        return arrowItem && arrowItem.quantity > 0;
    }

    async hasCharacterPotion(characterId) {
        const potionItem = await this.query(
            `SELECT ci.* FROM character_items ci 
            JOIN items i ON ci.item_id = i.id 
            WHERE ci.character_id = ? AND i.item_type = 'potion' AND ci.quantity > 0`,
            [characterId]
        );
        return potionItem && potionItem.quantity > 0;
    }
    
    async getCharacterConsumable(characterId, itemType) {
        const result = await this.query(
            `SELECT ci.id, ci.item_id as itemId, ci.quantity 
            FROM character_items ci 
            JOIN items i ON ci.item_id = i.id 
            WHERE ci.character_id = ? AND i.item_type = ?`,
            [characterId, itemType]
        );
        return result;
    }

    async updateUserItemQuantity(characterId, itemId, quantity) {
        const result = await this.execute(
            "UPDATE character_items SET quantity = ? WHERE character_id = ? AND item_id = ?",
            [quantity, characterId, itemId]
        );
        return result.affectedRows > 0;
    }

    async deleteUserItem(characterId, itemId) {
        const result = await this.execute(
            "DELETE FROM character_items WHERE character_id = ? AND item_id = ?", 
            [characterId, itemId]
        );
        return result.affectedRows > 0;
    }

    async getAllItemsData() {
        return await this.queryAll(`
            SELECT 
                id,
                name,
                item_type as itemType,
                weapon_type as weaponType,
                damage,
                attack_speed as attackSpeed,
                attack_distance as attackDistance,
                bonus_defense as bonusDefense,
                bonus_hp as bonusHp,
                cost
            FROM items
        `);
    }

    // ============ DELETE USER METHODS ============
    async deleteAllCharacterItems(characterId) {
        const result = await this.execute("DELETE FROM character_items WHERE character_id = ?", [characterId]);
        return result.affectedRows > 0;
    }

    async deleteAllCharacterClasses(characterId) {
        const result = await this.execute("DELETE FROM characters_classes WHERE character_id = ?", [characterId]);
        return result.affectedRows > 0;
    }

    async deleteUser(userId) {
        const result = await this.execute("DELETE FROM users WHERE id=?", [userId]);
        return result.affectedRows > 0;
    }

    // ============ TRANSACTION METHODS ============
    async beginTransaction() {
        const connection = await this.pool.getConnection();
        await connection.beginTransaction();
        return connection;
    }

    async commit(connection) {
        await connection.commit();
        connection.release();
    }

    async rollback(connection) {
        await connection.rollback();
        connection.release();
    }
}

module.exports = DB;