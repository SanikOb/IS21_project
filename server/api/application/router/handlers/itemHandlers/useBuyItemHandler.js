module.exports = (mediator, Answer) => {
    const { BUY_ITEM } = mediator.getEventTypes();

    return async (req, res) => {
        const params = {
            token: req.params.token,
            itemId: req.params.itemId
        };

        const response = await mediator.call(BUY_ITEM, params);
        res.json(Answer.ok(response));
    };
};