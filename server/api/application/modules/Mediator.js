class Mediator {
    constructor({ EVENTS, TRIGGERS }) {
        this.events = {};
        this.triggers = {};
        this.EVENTS = EVENTS;
        this.TRIGGERS = TRIGGERS;

        Object.keys(EVENTS).forEach(key => {
            this.events[this.EVENTS[key]] = [];
        });

        Object.keys(TRIGGERS).forEach(key => {
            this.triggers[this.TRIGGERS[key]] = () => {return null;};
        });
    }

    getEventTypes() {
        return this.EVENTS;
    }

    subscribe(name, func) {
        if (this.events[name] && func instanceof Function) {
            this.events[name].push(func);
        }
    }

    //А ЭТО ПРОСТО РАБОТАЕТ
    call(name, data) {
        if (this.events[name]) {
            const event = this.events[name][0];
            if (event instanceof Function) {
                return event(data);
            }
        }
    }

    /* //ОНО РАБОТАЕТ, НО ЧЕ-ТО ОШИБКИ НЕ ОБРАБАТЫВАЮТСЯ... (ПОМОГИТИ)
    call(name, data) {
        if (this.events[name]) {
            this.events[name].forEach(event => {
                if (event instanceof Function) {
                    event(data);
                }
            });
        }
    }*/

    unsubscribe(name, _func) {
        if (!this.events[name]) return;

        const handlerEntry = this.events[name]
            .map((func, i) => ([func, i]))
            .filter(([func]) => func === _func)[0];

        if (handlerEntry) {
            this.events[name].splice(handlerEntry[1], 1);
        }
    }

    unsubscribeAll(name) {
        if (name) {
            this.events[name] = [];
        } else {
            Object.keys(this.events).forEach(key => {
                this.events[key] = [];
            });
        }
    }

    getTriggerTypes() {
        return this.TRIGGERS;
    }

    set(name, func) {
        if (this.triggers.hasOwnProperty(name) && func instanceof Function) {
            this.triggers[name] = func;
        }
    }

    get(name, data) {
        if (this.triggers[name] && this.triggers[name] instanceof Function) {
            return this.triggers[name](data);
        }
        return null;
    }
}

module.exports = Mediator;