const mysql = require('mysql2/promise');
const CONFIG = require('../../../config.js');
const ORM = require('./ORM.js');

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
        this.orm = new ORM(this.pool);
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
        return this.orm.get('users', { login });
    }

    async getUserByToken(token) {
        return this.orm.get('users', { token });
    }

    async getUserById(id) {
        return this.orm.get('users', { id });
    }

    async updateToken(userId, token) {
        return this.orm.update('users', { id: userId }, { token });
    }

    async registration(login, password, nickname) {
        return this.orm.insert('users', { login, password, nickname });
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
        return this.orm.get('characters', { user_id: userId });
    }

    async createCharacter(userId) {
        return this.orm.insert(
            'characters',
            { user_id: userId, hp: 100, defence: 0, money: 1000 }
        );
    }

    async deleteCharacter(userId) {
        return this.orm.delete('characters', { user_id: userId });
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
        return this.orm.get(
            'room_members',
            { character_id: character.id },
            'type, room_id as roomId'
        );
    }

    // ============ MESSAGE METHODS ============
    async deleteUserMessages(userId) {
        return this.orm.delete('messages', { user_id: userId });
    }

    // ============ CLASS METHODS ============
    async getPersonClassById(id) {
        return this.orm.get('classes', { id });
    }

    async getAllPersonClasses() {
        return this.orm.all('classes');
    }

    async getUserPersonClass(userId, classId) {
        const character = await this.getCharacterByUserId(userId);
        if (!character) return null;
        return this.orm.get(
            'characters_classes',
            { character_id: character.id, class_id: classId }
        );
    }

    async addUserPersonClass(userId, classId) {
        const character = await this.getCharacterByUserId(userId);
        if (!character) return false;
        return this.orm.insert(
            'characters_classes',
            {
                character_id: character.id,
                class_id: classId,
                selected: 0
            }
        );
    }

    async clearSelectedUserClasses(userId) {
        const character = await this.getCharacterByUserId(userId);
        if (!character) return false;
        return this.orm.update(
            'characters_classes',
            { character_id: character.id },
            { selected: 0 }
        );
    }

    async getUserSelectedClassId(userId) {
        const character = await this.getCharacterByUserId(userId);
        if (!character) return null;
        const result = this.orm.get(
            'characters_classes',
            { character_id: character.id, selected: 1 },
            'class_id'
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

        return this.orm.update(
            'characters_classes',
            { character_id: character.id, class_id: classId },
            { selected: 1 }
        );
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
        return this.orm.get(
            'character_items',
            { character_id: characterId, item_id: itemId }
        )
    }

    async getUserPurchasedItemsWithQuantity(characterId) {
        const results = this.orm.all(
            'character_items',
            { character_id: characterId },
            'item_id as itemId, quantity'
        );

        return results.map(row => ({
            itemId: parseInt(row.itemId),
            quantity: parseInt(row.quantity)
        }));
    }

    async addUserItem(characterId, itemId) {
        return this.orm.insert(
            'character_items',
            { character_id: characterId, item_id: itemId, quantity: 1 }
        );
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
        return this.orm.update(
            'character_items',
            { character_id: characterId, item_id: itemId },
            { quantity }
        );
    }

    async deleteUserItem(characterId, itemId) {
        return this.orm.delete(
            'character_items',
            { character_id: characterId, item_id: itemId }
        );
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
        return this.orm.delete('character_items', { character_id: characterId });
    }

    async deleteAllCharacterClasses(characterId) {
        return this.orm.delete('characters_classes', { character_id: characterId });
    }

    async deleteUser(userId) {
        return this.orm.delete('users', { user_id: userId });
    }

    // ============ CHAT METHODS ============

    async getChatHash() {
        return this.orm.get('hashes', { id: 1 });
    }

    async updateChatHash(hash) {
        return this.orm.update('hashes', { id: 1 }, { chat_hash: hash });
    }

    async addMessage(userId, message) {
        return this.orm.insert(
            'messages', 
            { user_id: userId, message, created: 'now()'}
        );
    }

    async getMessages() {
        return this.queryAll(`
            SELECT u.nickname AS author, m.message AS message,
                   DATE_FORMAT(m.created, '%Y-%m-%d %H:%i:%s') AS created 
            FROM messages as m 
            LEFT JOIN users as u on u.id = m.user_id 
            ORDER BY m.created DESC
        `);
    }

    async deleteUserMessages(userId) {
        return this.orm.delete('message', { user_id: userId });
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