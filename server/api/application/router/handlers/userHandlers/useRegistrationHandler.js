module.exports = (mediator, Answer) => {
    const { REGISTRATION } = mediator.getEventTypes();

    return async (req, res) => {
        const params = {
            login: req.params.login,
            passwordHash: req.params.passwordHash,
            nickname: req.params.nickname
        };

        const response = await mediator.call(REGISTRATION, params);
        res.json(Answer.ok(response));
    };
};