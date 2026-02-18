module.exports = (mediator, Answer) => {
    const { APPLY_ARROW } = mediator.getEventTypes();

    return async (req, res) => {
        const params = {
            token: req.params.token
        };

        const response = await mediator.call(APPLY_ARROW, params);  
        res.json(Answer.ok(response));
    };
};