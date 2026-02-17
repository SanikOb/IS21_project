const BaseHandler = require('../BaseHandler.js');

class StartGameHandler extends BaseHandler {
    constructor(db) {
        super(db);
    }
    
    async execute(params) {
        try {
            // Проверка наличия всех необходимых параметров
            if (!params.token) {
                return { error: 242 };
            }
            
            // Получение пользователя по токену
            const user = await this.checkUserByToken(params.token);
            if (user.error) return user;
            
            // Проверка существования персонажа у пользователя
            const character = await this.checkCharacterExists(user.id);
            if (character.error) return character;
            
            // Проверка, что пользователь является владельцем комнаты
            const roomMember = await this.checkUserIsRoomOwner(user.id);
            if (roomMember.error) return roomMember;
            
            // Получение информации о комнате
            const room = await this.db.getRoomById(roomMember.roomId);
            if (!room) {
                return { error: 2003 };
            }
            
            // Проверка, что комната закрыта (все игроки зашли)
            if (room.status !== 'closed') {
                return { error: 2015 };
            }
            
            // Получение всех участников комнаты
            const roomMembers = await this.db.getAllRoomMembers(roomMember.roomId);
            
            // Проверка соответствия количества участников размеру комнаты
            if (roomMembers.length !== room.roomSize) {
                return { error: 2012 };
            }
            
            // Проверка статуса каждого участника (все должны быть готовы)
            let allReady = true;
            for (const member of roomMembers) {
                if (member.status !== 'ready') {
                    allReady = false;
                    break;
                }
            }
            
            if (!allReady) {
                return { error: 2012 };
            }
            
            // Начало транзакции
            const connection = await this.db.beginTransaction();
            try {
                // Изменение статуса комнаты на "started" (игра началась)
                await this.db.updateRoomStatus(roomMember.roomId, 'started');
                
                // Изменение статуса всех участников на "started"
                await this.db.updateAllRoomMembersStatus(roomMember.roomId, 'started');
                
                // Создание начальных данных для ботов в комнате
                await this.db.createInitialBotsForRoom(roomMember.roomId);
                
                // Создание начальных данных для стрел в комнате
                await this.db.createInitialArrowsForRoom(roomMember.roomId);
                
                // Обновление хеша комнаты для синхронизации с клиентами
                await this.db.updateRoomHash(this.md5(Math.random().toString()));
                
                // Подтверждение транзакции
                await this.db.commit(connection);
                return true;
                
            } catch (e) {
                // Откат транзакции в случае ошибки
                await this.db.rollback(connection);
                return { error: 9000 };
            }
            
        } catch (error) {
            // Обработка критических ошибок
            return { error: 9000 };
        }
    }
}

module.exports = StartGameHandler;