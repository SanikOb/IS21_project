module.exports = (mediator, Answer) => {
    const { LOGIN } = mediator.getTriggerTypes();

    return async (req, res) => {
        const params = {
            login: req.params.login,
            passwordHash: req.params.passwordHash
        };
        
        const response = await mediator.get(LOGIN, params);
        
        res.json(Answer.ok(response));
    };
};

