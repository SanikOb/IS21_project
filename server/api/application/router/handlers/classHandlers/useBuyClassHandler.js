module.exports = (mediator, Answer) => {
    const { BUY_CLASS } = mediator.getEventTypes();

    return async (req, res) => {
        const params = {
            token: req.params.token,
            classId: req.params.classId
        };

        const response = await mediator.call(BUY_CLASS, params);
        
        res.json(Answer.ok(response));
    };
};