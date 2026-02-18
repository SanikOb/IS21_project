// user handlers
const useLoginHandler = require("./userHandlers/useLoginHandler");
const useLogoutHandler = require("./userHandlers/useLogoutHandler");
const useRegistrationHandler = require("./userHandlers/useRegistrationHandler");
const useDeleteUserHandler = require("./userHandlers/useDeleteUserHandler");
const useGetUserInfoHandler = require("./userHandlers/useGetUserInfoHandler");
const useGetRatingTableHandler = require("./userHandlers/useGetRatingTableHandler");

// item handlers
const useBuyItemHandler = require("./itemHandlers/useBuyItemHandler");
const useSellItemHandler = require("./itemHandlers/useSellItemHandler");
const useApplyArrowHandler = require("./itemHandlers/useApplyArrowHandler");
const useApplyPotionHandler = require("./itemHandlers/useApplyPotionHandler");
const useGetItemsDataHandler = require("./itemHandlers/useGetItemsDataHandler");

// class handlers
const useBuyClassHandler = require("./classHandlers/useBuyClassHandler");
const useSelectClassHandler = require("./classHandlers/useSelectClassHandler");
const useGetClassesHandler = require("./classHandlers/useGetClassesHandler");

// chat handlers
const useGetMessagesHandler = require("./chatHandlers/useGetMessagesHandler");
const useSendMessageHandler = require("./chatHandlers/useSendMessageHandler");

module.exports = {
    // user
    useLoginHandler,
    useLogoutHandler,
    useRegistrationHandler,
    useDeleteUserHandler,
    useGetUserInfoHandler,
    useGetRatingTableHandler,
    // item
    useBuyItemHandler,
    useSellItemHandler,
    useApplyArrowHandler,
    useApplyPotionHandler,
    useGetItemsDataHandler,
    // class
    useBuyClassHandler,
    useSelectClassHandler,
    useGetClassesHandler,
    // chat
    useGetMessagesHandler,
    useSendMessageHandler
};