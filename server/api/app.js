const express = require('express');
const Router = require('./application/router/Router.js');
const Mediator = require('./application/modules/Mediator.js');
const CONFIG = require('./config.js');
const Answer = require('./application/router/Answer.js');
const UserManager = require('./application/modules/user/UserManager.js');
const ItemsManager = require('./application/modules/items/ItemsManager.js');
const DB = require('./application/modules/db/DB.js');
const LobbyManager = require('./application/modules/lobby/LobbyManager.js');

const app = express();

app.use((req, res, next) => {
    res.header('Content-Type', 'application/json; charset=utf-8');
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Экз БД
const db = new DB();

// Создание медиатора
const mediator = new Mediator({
    EVENTS: CONFIG.EVENTS,
    TRIGGERS: CONFIG.TRIGGERS
});

// Создаем менеджеры
new UserManager({ mediator, db });
new ItemsManager({ mediator, db });

// Coздание лобби
new LobbyManager({ mediator, db });

// Создаем роутер
const router = new Router(mediator);
app.use('/', router);

app.use((err, req, res, next) => {
    console.error('Cringe error:', err);
    res.json(Answer.response({ error: 9000 }));
});

// Запуск сервака
const PORT = CONFIG.SERVER_PORT;
const NAME = CONFIG.SERVER_NAME;
app.listen(PORT, () => {
    console.log(`Server ${NAME} running on port ${PORT}`);
});

module.exports = app;