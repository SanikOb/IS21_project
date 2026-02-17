const BaseHandler = require('../BaseHandler.js');

class JoinToRoomHandler extends BaseHandler {
    constructor(db) {
        super(db);
    }
    
    async execute(params) {
        try {
            // Проверка наличия всех необходимых параметров
            if (!params.token || !params.roomId) {
                return { error: 242 };
            }
            
            // Получение пользователя по токену
            const user = await this.checkUserByToken(params.token);
            if (user.error) return user;
            
            // Проверка существования персонажа у пользователя
            const character = await this.checkCharacterExists(user.id);
            if (character.error) return character;
            
            const roomId = parseInt(params.roomId);
            
            // Получение информации о комнате
            const room = await this.db.getRoomById(roomId);
            if (!room) {
                return { error: 2003 };
            }
            
            // Проверка, открыта ли комната для входа
            if (room.status !== 'open') {
                return { error: 2005 };
            }
            
            // Проверка, не находится ли пользователь в игре
            const isPlaying = await this.isUserPlaying(user.id);
            if (isPlaying) {
                return { error: 2001 };
            }
            
            // Проверка, не находится ли пользователь уже в комнате
            const existingRoomMember = await this.db.getRoomMemberByUserId(user.id);
            
            if (existingRoomMember) {
                // Если пользователь уже в этой же комнате
                if (existingRoomMember.roomId === roomId) {
                    return { error: 2004 };
                }
                // Если в другой комнате - выход из неё
                await this.leaveParticipantFromRoom(user.id);
            }
            
            // Проверка, не заполнена ли комната
            const roomMembers = await this.db.getAllRoomMembers(roomId);
            if (roomMembers.length >= room.roomSize) {
                return { error: 2005 }; // Комната уже заполнена
            }
            
            // Начало транзакции
            const connection = await this.db.beginTransaction();
            try {
                // Добавление участника в комнату
                await this.db.addRoomMember(roomId, character.id, 'participant');
                
                // Получение обновленного списка участников
                const updatedRoomMembers = await this.db.getAllRoomMembers(roomId);
                
                // Если комната заполнена, закрытие её для дальнейшего входа
                if (updatedRoomMembers.length >= room.roomSize) {
                    await this.db.updateRoomStatus(roomId, 'closed');
                }
                
                // Обновление хеша комнаты для синхронизации с клиентами
                await this.db.updateRoomHash(this.md5(Math.random().toString()));
                
                // Подтверждение транзакции
                await this.db.commit(connection);
                return true;
                
            } catch (e) {
                // Откат транзакции в случае ошибки
                await this.db.rollback(connection);
                return { error: 2004 };
            }
            
        } catch (error) {
            // Обработка критических ошибок
            return { error: 9000 };
        }
    }
}

module.exports = JoinToRoomHandler;