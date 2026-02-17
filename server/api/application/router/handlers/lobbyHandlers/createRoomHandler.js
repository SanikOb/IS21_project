const BaseHandler = require('../BaseHandler.js');
const CONFIG = require('../../../../config.js');

class CreateRoomHandler extends BaseHandler {
    constructor(db) {
        super(db);
    }
    
    async execute(params) {
        try {
            // Проверка наличия всех необходимых параметров
            if (!params.token || !params.roomName || !params.roomSize) {
                return { error: 242 };
            }
            
            // Получение пользователя по токену
            const user = await this.db.getUserByToken(params.token);
            
            if (!user) {
                return { error: 705 };
            }
            
            // Получение персонажа пользователя
            const character = await this.db.getCharacterByUserId(user.id);
            
            if (!character) {
                return { error: 706 };
            }
            
            // Проверка допустимого размера комнаты
            const roomSize = parseInt(params.roomSize);
            
            if (roomSize < CONFIG.ROOM_MIN_SIZE || roomSize > CONFIG.ROOM_MAX_SIZE) {
                return { error: 2013 };
            }
            
            // Проверка, не находится ли пользователь в игре
            const isPlaying = await this.db.isUserPlaying(user.id);
            
            if (isPlaying) {
                return { error: 2001 };
            }
            
            // Проверка, не находится ли пользователь уже в комнате
            const existingRoomMember = await this.db.getRoomMemberByUserId(user.id);
            
            if (existingRoomMember) {
                // Если пользователь уже в комнате, удаляем его оттуда
                await this.leaveParticipantFromRoom(user.id);
            }

            // Создание новой комнаты
            const roomId = await this.db.createRoom(user.id, params.roomName, roomSize);
            
            // Проверка успешности создания комнаты
            if (!roomId || isNaN(parseInt(roomId))) {
                return { error: 9000 };
            }
            
            // Если размер комнаты 1, сразу закрываем её (делаем недоступной для входа)
            if (roomSize === 1) {
                await this.db.updateRoomStatus(roomId, 'closed');
            }
            
            // Обновление хеша комнаты 
            await this.db.updateRoomHash(this.md5(Math.random().toString()));

            // Возвращаем успешный результат с ID созданной комнаты
            return { 
                success: true,
                roomId: roomId 
            };
            
        } catch (error) {
            return { error: 9000 };
        }
    }
}

module.exports = CreateRoomHandler;