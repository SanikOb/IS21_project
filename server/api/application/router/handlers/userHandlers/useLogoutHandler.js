module.exports = (mediator, Answer) => {
    const { LOGOUT } = mediator.getEventTypes();

    return async (req, res) => {
        const params = {
            token: req.params.token
        };

        const response = await mediator.call(LOGOUT, params);       
        res.json(Answer.ok(response));
    };
};