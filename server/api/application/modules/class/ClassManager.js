const BuyClassHandler = require('../../router/handlers/classHandlers/buyClassHandler.js');
const SelectClassHandler = require('../../router/handlers/classHandlers/selectClassHandler.js');
const GetClassesHandler = require('../../router/handlers/classHandlers/getClassesHandler.js');

class ClassManager {
    constructor({ mediator, db }) {
        this.db = db;
        this.mediator = mediator;
        // Получение типов ивентов и триггеров из медиатора
        const events = mediator.getEventTypes();
        const triggers = mediator.getTriggerTypes();

        // Подписка на ивенты
        mediator.subscribe(events.BUY_CLASS, this.buyClass.bind(this));
        mediator.subscribe(events.SELECT_CLASS, this.selectClass.bind(this));

        // Устанавливаем обработчики для триггеров
        mediator.set(triggers.GET_CLASSES, this.getClasses.bind(this));
    }

    async buyClass(params) {
        if (!params.token || !params.classId) {
            return { error: 242 };
        }
        const handler = new BuyClassHandler(this.db);
        return await handler.execute(params);
    }

    async selectClass(params) {
        if (!params.token || !params.classId) {
            return { error: 242 };
        }
        const handler = new SelectClassHandler(this.db);
        return await handler.execute(params);
    }

    async getClasses(params) {
        if (!params.token) {
            return { error: 242 };
        }
        const handler = new GetClassesHandler(this.db);
        return await handler.execute();
    }

}

module.exports = ClassManager;