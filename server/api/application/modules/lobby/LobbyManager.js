const CreateRoomHandler = require('../../router/handlers/lobbyHandlers/createRoomHandler.js');
const JoinToRoomHandler = require('../../router/handlers/lobbyHandlers/joinToRoomHandler.js');
const LeaveRoomHandler = require('../../router/handlers/lobbyHandlers/leaveRoomHandler.js');
const DropFromRoomHandler = require('../../router/handlers/lobbyHandlers/dropFromRoomHandler.js');
const StartGameHandler = require('../../router/handlers/lobbyHandlers/startGameHandler.js');

class LobbyManager {
    constructor({ mediator, db }) {
        this.db = db;
        this.mediator = mediator;

        const events = mediator.getEventTypes();

        mediator.subscribe(events.CREATE_ROOM, this.createRoom.bind(this));
        mediator.subscribe(events.JOIN_TO_ROOM, this.joinToRoom.bind(this));
        mediator.subscribe(events.LEAVE_ROOM, this.leaveRoom.bind(this));
        mediator.subscribe(events.DROP_FROM_ROOM, this.dropFromRoom.bind(this));
        mediator.subscribe(events.START_GAME, this.startGame.bind(this));
    }

    async createRoom(params) {
        if (!params.token || !params.roomName || !params.roomSize) {
            return { error: 242 };
        }
        const handler = new CreateRoomHandler(this.db);
        return await handler.execute(params);
    }

    async joinToRoom(params) {
        if (!params.token || !params.roomId) {
            return { error: 242 };
        }
        const handler = new JoinToRoomHandler(this.db);
        return await handler.execute(params);
    }

    async leaveRoom(params) {
        if (!params.token) {
            return { error: 242 };
        }
        const handler = new LeaveRoomHandler(this.db);
        return await handler.execute(params);
    }

    async dropFromRoom(params) {
        if (!params.token || !params.targetToken) {
            return { error: 242 };
        }
        const handler = new DropFromRoomHandler(this.db);
        return await handler.execute(params);
    }

    async startGame(params) {
        if (!params.token) {
            return { error: 242 };
        }
        const handler = new StartGameHandler(this.db);
        return await handler.execute(params);
    }
}

module.exports = LobbyManager;