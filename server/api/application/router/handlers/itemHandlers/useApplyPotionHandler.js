module.exports = (mediator, Answer) => {
    const { APPLY_POTION } = mediator.getEventTypes();

    return async (req, res) => {
        const params = {
            token: req.params.token
        };

        const response = await mediator.call(APPLY_POTION, params);
        res.json(Answer.ok(response));
    };
};