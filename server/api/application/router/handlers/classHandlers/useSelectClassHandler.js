module.exports = (mediator, Answer) => {
    const { SELECT_CLASS } = mediator.getEventTypes();

    return async (req, res) => {
        const params = {
            token: req.params.token,
            classId: req.params.classId
        };

        const response = await mediator.call(SELECT_CLASS, params);
        
        res.json(Answer.ok(response));
    };
};