module.exports = (mediator, Answer) => {
    const { DELETE_USER } = mediator.getEventTypes();

    return async (req, res) => {
        const params = {
            token: req.params.token
        };

        const response = await mediator.call(DELETE_USER, params);     
        res.json(Answer.ok(response));
    };
};