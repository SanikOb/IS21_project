module.exports = (mediator, Answer) => {
    const { SEND_MESSAGE } = mediator.getEventTypes();

    return async (req, res) => {
        const params = {
            token: req.params.token,
            message: req.params.message
        };

        const response = await mediator.call(SEND_MESSAGE, params);
        
        res.json(Answer.ok(response));
    };
};