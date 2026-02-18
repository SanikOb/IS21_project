module.exports = (mediator, Answer) => {
    const { GET_USER_INFO } = mediator.getTriggerTypes();

    return async (req, res) => {
        const params = {
            token: req.params.token
        };

        const response = await mediator.get(GET_USER_INFO, params);
        res.json(Answer.ok(response));
    };
};