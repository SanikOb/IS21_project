const BaseHandler = require('../BaseHandler.js');

class DropFromRoomHandler extends BaseHandler {
    constructor(db) {
        super(db);
    }
    
    async execute(params) {
        try {
            // Проверка наличия всех необходимых параметров
            if (!params.token || !params.targetToken) {
                return { error: 242 };
            }
            
            // Получение пользователя (владельца комнаты) по токену
            const user = await this.checkUserByToken(params.token);
            if (user.error) return user;
            
            // Проверка существования персонажа у пользователя
            const character = await this.checkCharacterExists(user.id);
            if (character.error) return character;
            
            // Проверка, что пользователь является владельцем комнаты
            const roomMember = await this.checkUserIsRoomOwner(user.id);
            if (roomMember.error) return roomMember;
            
            // Получение целевого пользователя для исключения по токену
            const targetUser = await this.db.getUserByToken(params.targetToken);
            if (!targetUser) {
                return { error: 705 };
            }
            
            // Запрет на исключение самого себя
            if (user.id === targetUser.id) {
                return { error: 2007 };
            }
            
            // Проверка, что целевой пользователь находится в той же комнате
            const targetRoomMember = await this.db.getRoomMemberByUserId(targetUser.id);
            
            if (!targetRoomMember || targetRoomMember.roomId !== roomMember.roomId) {
                return { error: 2009 };
            }
            
            // Начало транзакции
            const connection = await this.db.beginTransaction();
            try {
                // Исключение участника из комнаты
                await this.leaveParticipantFromRoom(targetUser.id);
                
                // Получение актуальной информации о комнате
                const room = await this.db.getRoomById(roomMember.roomId);
                
                // Если комната не в статусе started, открываем её для новых участников
                if (room && room.status !== 'started') {
                    await this.db.updateRoomStatus(roomMember.roomId, 'open');
                }
                
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
            return { error: 9000 };
        }
    }
}

module.exports = DropFromRoomHandler;