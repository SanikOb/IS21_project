module.exports = (mediator, Answer) => {
    const { GET_MESSAGES } = mediator.getTriggerTypes();

    return async (req, res) => {
        const params = {
            token: req.params.token,
            hash: req.params.hash
        };

        const response = await mediator.get(GET_MESSAGES, params);
        
        res.json(Answer.ok(response));
    };
};