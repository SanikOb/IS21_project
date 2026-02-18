module.exports = (mediator, Answer) => {
    const { GET_RATING_TABLE } = mediator.getTriggerTypes();

    return async (req, res) => {
        const params = {
            token: req.params.token
        };

        const response = await mediator.get(GET_RATING_TABLE, params);   
        res.json(Answer.ok(response));
    };
};