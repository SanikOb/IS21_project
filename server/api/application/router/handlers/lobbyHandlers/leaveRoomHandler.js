const BaseHandler = require('../BaseHandler.js');

class LeaveRoomHandler extends BaseHandler {
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
            
            // Проверка, находится ли пользователь в комнате
            const roomMember = await this.db.getRoomMemberByUserId(user.id);
            if (!roomMember) {
                return { error: 2006 };
            }
            
            // Получение информации о комнате
            const room = await this.db.getRoomById(roomMember.roomId);
            if (!room) {
                return { error: 2003 };
            }
            
            // Начало транзакции
            const connection = await this.db.beginTransaction();
            try {
                // Обработка выхода владельца комнаты
                if (roomMember.type === 'owner') {
                    // Если игра уже началась, удаление данных ботов и стрел
                    if (room.status === 'started') {
                        await this.db.deleteAllBotsForRoom(roomMember.roomId);
                        await this.db.deleteAllArrowsForRoom(roomMember.roomId);
                    }
                    
                    // Удаление всех участников комнаты
                    await this.db.deleteAllRoomMembers(roomMember.roomId);
                    // Удаление самой комнаты
                    await this.db.deleteRoom(roomMember.roomId);
                    
                } else {
                    // Обработка выхода обычного участника
                    await this.leaveParticipantFromRoom(user.id);
                    
                    // Получение списка оставшихся участников
                    const remainingMembers = await this.db.getAllRoomMembers(roomMember.roomId);
                    
                    // Если комната не в статусе started и в ней есть участники, открытие её для входа
                    if (room.status !== 'started' && remainingMembers.length > 0) {
                        await this.db.updateRoomStatus(roomMember.roomId, 'open');
                    }
                    
                    // Если в комнате не осталось участников, удаление комнаты
                    if (remainingMembers.length === 0) {
                        await this.db.deleteRoom(roomMember.roomId);
                    }
                }
                
                // Обновление хеша комнаты для синхронизации с клиентами
                await this.db.updateRoomHash(this.md5(Math.random().toString()));
                
                // Подтверждение транзакции
                await this.db.commit(connection);
                return true;
                
            } catch (e) {
                // Откат транзакции в случае ошибки
                await this.db.rollback(connection);
                return { error: 2006 };
            }
            
        } catch (error) {
            return { error: 9000 };
        }
    }
}

module.exports = LeaveRoomHandler;