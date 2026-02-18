module.exports = (mediator, Answer) => {
    const { GET_CLASSES } = mediator.getTriggerTypes();

    return async (req, res) => {
        const params = {
            token: req.params.token
        };

        const response = await mediator.get(GET_CLASSES, params);
        
        res.json(Answer.ok(response));
    };
};