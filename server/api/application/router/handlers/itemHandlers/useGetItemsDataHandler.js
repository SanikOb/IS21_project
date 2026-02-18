module.exports = (mediator, Answer) => {
    const { GET_ITEMS_DATA } = mediator.getTriggerTypes();

    return async (req, res) => {
        const params = {
            token: req.params.token
        };

        const response = await mediator.get(GET_ITEMS_DATA, params);
        res.json(Answer.ok(response));
    };
};