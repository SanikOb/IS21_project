const express = require('express');
const Answer = require('./Answer.js');
const { 
    useLoginHandler, 
    useLogoutHandler,
    useRegistrationHandler,
    useDeleteUserHandler,
    useGetUserInfoHandler,
    useGetRatingTableHandler,
    useBuyItemHandler,
    useSellItemHandler,
    useApplyArrowHandler,
    useApplyPotionHandler,
    useGetItemsDataHandler,
    useBuyClassHandler,
    useSelectClassHandler,
    useGetClassesHandler,
    useGetMessagesHandler,
    useSendMessageHandler
} = require('./handlers');

function Router(mediator) {
    const router = express.Router();

    // ============ USER ROUTES ============
    router.post('/logout{/:token}', useLogoutHandler(mediator, Answer));
    router.post('/registration{/:login}{/:passwordHash}{/:nickname}', useRegistrationHandler(mediator, Answer));
    router.post('/deleteUser{/:token}', useDeleteUserHandler(mediator, Answer));
    router.get('/login{/:login}{/:passwordHash}', useLoginHandler(mediator, Answer));
    router.get('/getUserInfo{/:token}', useGetUserInfoHandler(mediator, Answer));
    router.get('/getRatingTable{/:token}', useGetRatingTableHandler(mediator, Answer));

    // ============ ITEMS ROUTES ============
    router.post('/buyItem{/:token}{/:itemId}', useBuyItemHandler(mediator, Answer));
    router.post('/sellItem{/:token}{/:itemId}', useSellItemHandler(mediator, Answer));
    router.post('/applyArrow{/:token}', useApplyArrowHandler(mediator, Answer));
    router.post('/applyPotion{/:token}', useApplyPotionHandler(mediator, Answer));
    router.get('/getItemsData{/:token}', useGetItemsDataHandler(mediator, Answer));

    // ============ CLASS ROUTES ============
    router.post('/buyClass{/:token}{/:classId}', useBuyClassHandler(mediator, Answer));
    router.post('/selectClass{/:token}{/:classId}', useSelectClassHandler(mediator, Answer));
    router.get('/getClasses{/:token}', useGetClassesHandler(mediator, Answer));

    // ============ CHAT ROUTES ============
    router.get('/getMessages{/:token}{/:hash}', useGetMessagesHandler(mediator, Answer));
    router.post('/sendMessage{/:token}{/:message}', useSendMessageHandler(mediator, Answer));

    // ============ NOT FOUND ============
    router.get('/*path', (req, res) => {
         res.json(Answer.ok({error: 404}));
    });

    router.post('/*path', (req, res) => {
         res.json(Answer.ok({error: 404}));
    });

    return router;
}

module.exports = Router;